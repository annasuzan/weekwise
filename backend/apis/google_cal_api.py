"""
Google Calendar Integration - Scheduler API
============================================
A Flask-based REST API to interact with Google Calendar.

Setup:
1. Install dependencies:
   pip install flask google-auth google-auth-oauthlib google-api-python-client python-dotenv

2. Enable Google Calendar API:
   - Go to https://console.cloud.google.com/
   - Create a project → Enable "Google Calendar API"
   - Go to "Credentials" → Create OAuth 2.0 Client ID (Desktop App)
   - Download the JSON and save it as `credentials.json` in this directory

3. Run the app:
   python google_calendar_api.py
   - On first run, a browser window will open to authorize access.
   - A `token.json` file will be created to store your session.
"""

import os
import json
from datetime import datetime, timedelta, timezone

from flask import Flask, request, jsonify
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# ── Config ──────────────────────────────────────────────────────────────────

app = Flask(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar"]
CREDENTIALS_FILE = "credentials.json"   # Downloaded from Google Cloud Console
TOKEN_FILE = "token.json"               # Auto-generated after first auth


# ── Auth Helper ──────────────────────────────────────────────────────────────

def get_calendar_service():
    """Authenticate and return a Google Calendar service object."""
    creds = None

    # Load existing token
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    # Refresh or re-authorize if needed
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                raise FileNotFoundError(
                    f"'{CREDENTIALS_FILE}' not found. "
                    "Download it from Google Cloud Console."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)

        # Save token for future runs
        with open(TOKEN_FILE, "w") as token:
            token.write(creds.to_json())

    return build("calendar", "v3", credentials=creds)


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/events", methods=["GET"])
def list_events():
    """
    GET /events
    List upcoming events from the primary calendar.

    Query params:
      - max_results (int, default 10): Number of events to return.
      - time_min (str, ISO 8601): Start of time range. Defaults to now.
      - time_max (str, ISO 8601): End of time range. Optional.

    Example:
      GET /events?max_results=5
      GET /events?time_min=2026-03-20T00:00:00Z&time_max=2026-03-27T00:00:00Z
    """
    try:
        service = get_calendar_service()

        max_results = int(request.args.get("max_results", 10))
        time_min = request.args.get(
            "time_min",
            datetime.now(timezone.utc).isoformat()
        )
        time_max = request.args.get("time_max", None)

        params = {
            "calendarId": "primary",
            "timeMin": time_min,
            "maxResults": max_results,
            "singleEvents": True,
            "orderBy": "startTime",
        }
        if time_max:
            params["timeMax"] = time_max

        events_result = service.events().list(**params).execute()
        events = events_result.get("items", [])

        # Simplify the response payload
        simplified = [
            {
                "id": e.get("id"),
                "summary": e.get("summary", "(No title)"),
                "description": e.get("description", ""),
                "location": e.get("location", ""),
                "start": e.get("start", {}).get("dateTime") or e.get("start", {}).get("date"),
                "end": e.get("end", {}).get("dateTime") or e.get("end", {}).get("date"),
                "html_link": e.get("htmlLink"),
            }
            for e in events
        ]

        return jsonify({"count": len(simplified), "events": simplified}), 200

    except HttpError as e:
        return jsonify({"error": str(e)}), e.resp.status
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/events/<event_id>", methods=["GET"])
def get_event(event_id):
    """
    GET /events/<event_id>
    Retrieve a single event by its ID.

    Example:
      GET /events/abc123xyz
    """
    try:
        service = get_calendar_service()
        event = service.events().get(calendarId="primary", eventId=event_id).execute()

        return jsonify({
            "id": event.get("id"),
            "summary": event.get("summary", "(No title)"),
            "description": event.get("description", ""),
            "location": event.get("location", ""),
            "start": event.get("start", {}),
            "end": event.get("end", {}),
            "attendees": event.get("attendees", []),
            "html_link": event.get("htmlLink"),
        }), 200

    except HttpError as e:
        return jsonify({"error": str(e)}), e.resp.status
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/events", methods=["POST"])
def create_event():
    """
    POST /events
    Create a new event in the primary calendar.

    Request body (JSON):
      {
        "summary":     "Team Standup",           # required
        "start":       "2026-03-21T10:00:00",    # required (ISO 8601, local time)
        "end":         "2026-03-21T10:30:00",    # required (ISO 8601, local time)
        "description": "Daily sync",             # optional
        "location":    "Zoom / Office",          # optional
        "timezone":    "America/New_York",        # optional (defaults to UTC)
        "attendees":   ["alice@example.com"]     # optional list of emails
      }

    Example curl:
      curl -X POST http://localhost:5000/events \\
        -H "Content-Type: application/json" \\
        -d '{"summary":"Lunch","start":"2026-03-21T12:00:00","end":"2026-03-21T13:00:00"}'
    """
    try:
        body = request.get_json()
        if not body:
            return jsonify({"error": "Request body must be JSON"}), 400

        # Required fields
        for field in ("summary", "start", "end"):
            if field not in body:
                return jsonify({"error": f"Missing required field: '{field}'"}), 400

        tz = body.get("timezone", "UTC")

        event_body = {
            "summary": body["summary"],
            "start": {"dateTime": body["start"], "timeZone": tz},
            "end":   {"dateTime": body["end"],   "timeZone": tz},
        }

        if "description" in body:
            event_body["description"] = body["description"]
        if "location" in body:
            event_body["location"] = body["location"]
        if "attendees" in body:
            event_body["attendees"] = [{"email": e} for e in body["attendees"]]

        service = get_calendar_service()
        event = service.events().insert(calendarId="primary", body=event_body).execute()

        return jsonify({
            "message": "Event created successfully",
            "id": event.get("id"),
            "html_link": event.get("htmlLink"),
        }), 201

    except HttpError as e:
        return jsonify({"error": str(e)}), e.resp.status
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/events/<event_id>", methods=["PUT"])
def update_event(event_id):
    """
    PUT /events/<event_id>
    Update an existing event. Only fields provided in the body are changed.

    Request body (JSON) — all fields optional:
      {
        "summary":     "Updated Title",
        "start":       "2026-03-21T11:00:00",
        "end":         "2026-03-21T11:30:00",
        "description": "New description",
        "location":    "New location",
        "timezone":    "America/New_York"
      }
    """
    try:
        service = get_calendar_service()

        # Fetch the existing event first
        event = service.events().get(calendarId="primary", eventId=event_id).execute()

        body = request.get_json() or {}
        tz = body.get("timezone", event.get("start", {}).get("timeZone", "UTC"))

        if "summary" in body:
            event["summary"] = body["summary"]
        if "description" in body:
            event["description"] = body["description"]
        if "location" in body:
            event["location"] = body["location"]
        if "start" in body:
            event["start"] = {"dateTime": body["start"], "timeZone": tz}
        if "end" in body:
            event["end"] = {"dateTime": body["end"], "timeZone": tz}

        updated = service.events().update(
            calendarId="primary", eventId=event_id, body=event
        ).execute()

        return jsonify({
            "message": "Event updated successfully",
            "id": updated.get("id"),
            "html_link": updated.get("htmlLink"),
        }), 200

    except HttpError as e:
        return jsonify({"error": str(e)}), e.resp.status
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/events/<event_id>", methods=["DELETE"])
def delete_event(event_id):
    """
    DELETE /events/<event_id>
    Delete an event by its ID.

    Example:
      DELETE /events/abc123xyz
    """
    try:
        service = get_calendar_service()
        service.events().delete(calendarId="primary", eventId=event_id).execute()
        return jsonify({"message": f"Event '{event_id}' deleted successfully"}), 200

    except HttpError as e:
        return jsonify({"error": str(e)}), e.resp.status
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Starting Google Calendar Scheduler API...")
    print("Endpoints:")
    print("  GET    /events              - List upcoming events")
    print("  GET    /events/<id>         - Get a single event")
    print("  POST   /events              - Create a new event")
    print("  PUT    /events/<id>         - Update an event")
    print("  DELETE /events/<id>         - Delete an event")
    app.run(debug=True, port=5000)
























































# import datetime
# import os.path
# from google.auth.transport.requests import Request
# from google.oauth2.credentials import Credentials
# from google_auth_oauthlib.flow import InstalledAppFlow
# from googleapiclient.discovery import build
# from googleapiclient.errors import HttpError
# from datetime import datetime, timedelta, timezone
# import json

# # Define the scope required for creating/editing events
# # https://www.googleapis.com/auth/calendar.events is the recommended scope
# SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly"]

# def authenticate_google_calendar():
#     """Shows how to set up the Google API credentials using the downloaded client_secret.json."""
#     creds = None
#     # The file token.json stores the user's access and refresh tokens, 
#     # and is created automatically when the authorization flow completes for the first time.
  


#     if os.path.exists("token.json"):
#         creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    
#     # If there are no (valid) credentials available, let the user log in.
#     if not creds or not creds.valid:
#         if creds and creds.expired and creds.refresh_token:
#             # Refresh the token if it's expired
#             creds.refresh(Request())
#         else:
#             print("right here")

#             REDIRECT_URI = "http://localhost:9090/oauth2callback"

#             # Start the OAuth flow
#             # The flow will automatically use the Authorized Redirect URIs defined 
#             # in your client_secret.json (like http://localhost:8080/oauth2callback)
#             flow = InstalledAppFlow.from_client_secrets_file(
#                 "client_secret_588465002822-qd2mph5ci7utptfs4073p9vc0sldihqm.apps.googleusercontent.com.json", SCOPES
#             )


#             # flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
            
#             # This line will open the browser for user consent
#             # creds = flow.run_local_server(port=8080)
#             creds = flow.run_local_server(port=9090)
            
#         # Save the credentials for the next run
#         with open("token.json", "w") as token:
#             token.write(creds.to_json())

#     return creds

# def list_user_calendars(service):
#     """Fetches and prints the list of calendars accessible by the user."""
#     try:
#         # Call the Calendar API's calendarList.list method
#         print("Fetching user calendar list...")
        
#         calendar_list = service.calendarList().list().execute()
        
#         calendars = calendar_list.get('items', [])
        
#         if not calendars:
#             print("No calendars found.")
#             return

#         print("\n--- User Calendars ---")
#         print("{:<45} {:<50}".format("Calendar ID (Use this for events)", "Summary/Name"))
#         print("-" * 95)
        
#         for calendar in calendars:
#             calendar_id = calendar['id']
#             summary = calendar.get('summary', 'No Name')
            
#             print(f"{calendar_id:<45} {summary:<50}")
            
#     except HttpError as error:
#         print(f"An error occurred: {error}")

# def get_calendar_events(service, calendar_id='primary'):
#     """
#     Fetches events from the specified calendar for a defined time range.

#     Args:
#         service: The authenticated Google Calendar API service object.
#         calendar_id: The ID of the calendar to query (e.g., 'primary').
#     """
#     try:
#         # Define the time range for the query
        
#         # 1. Get current UTC time
#         now = datetime.now(timezone.utc)

#         # 2. Set start time to *today at 00:00 UTC*
#         start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
#         time_min = start_of_today.isoformat().replace("+00:00", "Z")

#         # 3. Set end time to 7 days from now
#         future = start_of_today + timedelta(days=7)
#         time_max = future.isoformat().replace("+00:00", "Z")

#         print(f"\nFetching events for Calendar ID: {calendar_id}")
#         print(f"Time Range: {now.date()} to {future.date()}")
        
#         # --- Make the API Call: events.list() ---
#         events_result = service.events().list(
#             calendarId=calendar_id,
#             timeMin=time_min,
#             timeMax=time_max,
#             maxResults=10,  # Limit to 10 events for testing
#             singleEvents=True, # Expand recurring events into individual instances
#             orderBy='startTime' # Sort by start time
#         ).execute()
        
#         events = events_result.get('items', [])

#         time_ranges = []

#         for event in events:
#             start = event.get("start", {}).get("dateTime")
#             end = event.get("end", {}).get("dateTime")
#             time_ranges.append({"start": start, "end": end})

#         print("\n--- Upcoming Events ---")

#         print(time_ranges)
        
#         # pretty_json_string = json.dumps(events,indent=4,sort_keys=True )
#         # print(pretty_json_string)
#         # if not events:
#         #     print("No upcoming events found in this range.")
#         #     return

#         # print("-" * 50)
#         # print("Upcoming Events (Next 7 Days):")
        
#         # for event in events:
#         #     start = event['start'].get('dateTime', event['start'].get('date'))
#         #     summary = event.get('summary', 'No Title')
            
#         #     print(f"- {start} | {summary}")
            
#         # print("-" * 50)
#         return time_ranges

#     except HttpError as error:
#         print(f"An error occurred while fetching events: {error}")


# def create_calendar_event(service, item: dict):
#     """Creates a simple 1-hour event on the user's primary calendar."""
    
#     # --- 1. Define the Event Details ---
    
#     # Define start and end times in RFC 3339 format


#     event_body = {
#         'summary': item['summary'],
#         'location': 'Created by Zone',     # or item.get("location")
#         'description': item['description'],

#         'start': {
#             'dateTime': item['start_iso'],
#             'timeZone': 'America/New_York',
#         },
#         'end': {
#             'dateTime': item['end_iso'],
#             'timeZone': 'America/New_York',
#         }
#     }
#     # Include optional colorId if provided (Google Calendar accepts '1'..'11')
#     if item.get('colorId'):
#         event_body['colorId'] = str(item.get('colorId'))
    
#     # start_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
#     # end_time = start_time + datetime.timedelta(hours=1)
#     # event_body = {
#     #     'summary': 'Team Sync-Up Meeting (Python API Test)',
#     #     'location': 'Online via Google Meet',
#     #     'description': 'A quick test event created using the Google Calendar Python API.',
        
#     #     # Date/Time details must include the timezone
#     #     'start': {
#     #         'dateTime': start_time.isoformat(),
#     #         'timeZone': 'America/New_York', # Use your preferred timezone
#     #     },
#     #     'end': {
#     #         'dateTime': end_time.isoformat(),
#     #         'timeZone': 'America/New_York',
#     #     },
        
#     #     # Optional: Add attendees
#     #     'attendees': [
#     #         {'email': 'pavithra.rajan01@gmail.com'}, # Replace with actual emails
#     #         {'email': 'annasusanc@gmail.com'},
#     #     ],
        
#     #     # Optional: Add a conference link (e.g., Google Meet)
#     #     'conferenceData': {
#     #         'createRequest': {
#     #             'requestId': 'meeting-request-123',
#     #             'conferenceSolutionKey': {'type': 'hangoutsMeet'}
#     #         }
#     #     }
#     # }

#     # --- 2. Make the API Call ---
#     try:
#         # The 'primary' ID refers to the user's main calendar
#         event = service.events().insert(
#             calendarId='primary',
#             sendUpdates='all', # Controls email notifications to guests
#             body=event_body,
#             conferenceDataVersion=1 # Required for creating a Meet link
#         ).execute()
        
#         print("-" * 50)
#         print(f"Event created successfully!")
#         print(f"Summary: {event.get('summary')}")
#         print(f"Event ID: {event.get('id')}")
#         print(f"Link: {event.get('htmlLink')}")
#         print("-" * 50)

#     except HttpError as error:
#         print(f"An error occurred: {error}")


# def gcal_events():
#         creds = authenticate_google_calendar()
        
#         service = build("calendar", "v3", credentials=creds)

#         return get_calendar_events(service, calendar_id='primary')
        
# # --- Main Execution ---
# # def main():
# #     try:
# #         # 1. Authenticate and get credentials
# #         creds = authenticate_google_calendar()
        
# #         # 2. Build the service object
# #         service = build("calendar", "v3", credentials=creds)
        
# #         # 3. Create the event
# #         # create_calendar_event(service)

# #         # 4. List user calendars
# #         # list_user_calendars(service)

# #         # 5. Fetch and print events from the primary calendar
# #         get_calendar_events(service, calendar_id='primary')
        
# #     except Exception as e:
# #         print(f"A critical error occurred in main: {e}")

# # if __name__ == "__main__":
# #     main()