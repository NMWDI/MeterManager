# WaterManagerDB

[![Unittests](https://github.com/NMWDI/WaterManagerDB/actions/workflows/testing.yml/badge.svg)](https://github.com/NMWDI/WaterManagerDB/actions/workflows/testing.yml)
[![Format code](https://github.com/NMWDI/WaterManagerDB/actions/workflows/format_code.yml/badge.svg)](https://github.com/NMWDI/WaterManagerDB/actions/workflows/format_code.yml)

## Versions
- V0.2.0 - Added weasyprint for PDF generation, this requires a new Docker image to be built.
- V0.1.52 - Deploy chlorides for admin testing
- V0.1.51.1 - Increased frontend signout to 300 minutes
- V0.1.51 - Improved monitoring well page
- V0.1.50 - Fixed wells map bug and update register if part used
- V0.1.49 - Added outside recorder wells to monitoring page
- V0.1.48 - Changed well owner to be meter water users
- V0.1.47 - Add TRSS grids to meter map and fixed meter register save bug
- V0.1.46 - Change how data is displayed in Wells table
- V0.1.45 - Color code meter markers on map by last PM
- V0.1.44 - Fix bug in continuous monitoring well data and added data to OSE endpoint
- V0.1.43 - Fix navigation from work orders to activity, add OSE endpoint for "data issues"
- V0.1.42 - Fix pagination, add 'uninstall and hold'
- V0.1.41 - Add UI for water source on wells and some other minor changes
- V0.1.40 - Add register to UI on meter details
- V0.1.39 - Default share ose when workorder, OSE access to register information
- V0.1.38 - Change logout time to 8 hours, show work order count in navigation
- V0.1.37.1 - Fix various work order bugs
- V0.1.37 - Update OSE API to include ose_request_id and new endpoint
- V0.1.36 - Improved work orders, testing still needed
- V0.1.35.1 - Fix bug with well search failing on certain inputs
- V0.1.35 - Update continuous data stream IDs for monitoring wells
- V0.1.34 - Work orders ready for alpha testing, reordered monitoring wells
- V0.1.33 - Add Meter Status Filter to Meters Table
- V0.1.32 - Fix Monitoring Wells so that table updates after change
- V0.1.31 - Added note "verified register ratio" and made it appear by default
- V0.1.30 - Admin can edit monitoring well data (note that monitoring well table still not updating automatically)
- V0.1.29 - Fixed bug preventing meter type change
- V0.1.28 - Full admin UI on meter page
- V0.1.27 - Give admin ability to add out of order activities, fix zoom on map, other minor changes
- V0.1.26 - Add functional merge button for admin
- V0.1.25 - Fix datesort on meter history, give techs limited well management
- V0.1.24 - Add non-functional merge button for initial testing
- V0.1.23 - Prevent duplicate activities from being added
- V0.1.22 - Change ownership so there is now water_users and meter_owner
- V0.1.21 - Implement Degrees Minutes Seconds (DMS) for lat/long
- V0.1.20 - Fix monitoring wells sort
- V0.1.19 - Updated OSE endpoint to have activity_id, reorganized data returned
- V0.1.18 - Only require well on install activity, display OSE tag
- V0.1.17 - Restructure security code to prevent database connection problems
- V0.1.16 - Fixed bug where status is changed when clearing well from meter
- V0.1.15 - Updated backend to use SQLAlchemy 2 (resolve connection issue?)
- V0.1.14 - Display RA number instead of well name, well distance is now observation, new default observations
- V0.1.13 - Add checkbox for sharing activities with OSE.
- V0.1.12 - Change lat/long to DMS, reorder observation inputs, block out of order activities
- V0.1.11 - Remove all async code to see if it fixes deadlock issue
- V0.1.10 - Fix owners and osetag on Wells page
- V0.1.9 - Add owners to Meters table, fix various bugs
- V0.1.8 - Fix bug in meter selection autocomplete
- V0.1.7 - Fixed bugs in Add Meter
- V0.1.6 - Various fixes and meter search via map UI
- V0.1.5 - Various minor bug fixes
- V0.1.4 - Updated "current installation" section of activities to match Meters page
- V0.1.3 - Added user admin, improved appearance, fixed OSE endpoint scope.
- V0.1.2 - Added an initial parts inventory and minor meter installation UI improvements
- V0.1.1 - Initial version with new clean database
- V0.0 - Initial minimum viable product

## Purpose
This web app facilitates reporting of water management operations to other organizations. The initial goal is to help water conservation districts communicate with local and state governments. However, the interface may eventually be developed to be more general.

## Installation
The app is built with the following components:
* PostgreSQL database with PostGIS extension
* Python FastAPI backend for interfacing with database
* React based frontend

App components are organized into Docker containers, but it can also be run locally.

To run the app, clone the repository and use Docker Compose to run:
```
/watermanagerdb >> docker compose -f docker-compose.dev.yml --build
```

The API component will need several environmental variables that should be specified in the file 'api/.env'. See api/.env_example for an example. The PostgreSQL environmental variables should match the database settings.
