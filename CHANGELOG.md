# Changelog

All notable changes to **Meter Manager** will be documented in this file.

| Version   | Changes |
|-----------|---------|
| v0.2.0    | Parts-used report functional with PDF download |
| v0.1.52   | Deploy chlorides for admin testing |
| v0.1.51.1 | Increased frontend signout to 300 minutes |
| v0.1.51   | Improved monitoring well page |
| v0.1.50   | Fixed wells map bug and update register if part used |
| v0.1.49   | Added outside recorder wells to monitoring page |
| v0.1.48   | Changed well owner to be meter water users |
| v0.1.47   | Add TRSS grids to meter map and fixed meter register save bug |
| v0.1.46   | Change how data is displayed in Wells table |
| v0.1.45   | Color code meter markers on map by last PM |
| v0.1.44   | Fix bug in continuous monitoring well data and added data to OSE endpoint |
| v0.1.43   | Fix navigation from work orders to activity, add OSE endpoint for "data issues" |
| v0.1.42   | Fix pagination, add 'uninstall and hold' |
| v0.1.41   | Add UI for water source on wells and some other minor changes |
| v0.1.40   | Add register to UI on meter details |
| v0.1.39   | Default share ose when workorder, OSE access to register information |
| v0.1.38   | Change logout time to 8 hours, show work order count in navigation |
| v0.1.37.1 | Fix various work order bugs |
| v0.1.37   | Update OSE API to include ose_request_id and new endpoint |
| v0.1.36   | Improved work orders, testing still needed |
| v0.1.35.1 | Fix bug with well search failing on certain inputs |
| v0.1.35   | Update continuous data stream IDs for monitoring wells |
| v0.1.34   | Work orders ready for alpha testing, reordered monitoring wells |
| v0.1.33   | Add Meter Status Filter to Meters Table |
| v0.1.32   | Fix Monitoring Wells so that table updates after change |
| v0.1.31   | Added note "verified register ratio" and made it appear by default |
| v0.1.30   | Admin can edit monitoring well data (note that monitoring well table still not updating automatically) |
| v0.1.29   | Fixed bug preventing meter type change |
| v0.1.28   | Full admin UI on meter page |
| v0.1.27   | Give admin ability to add out of order activities, fix zoom on map, other minor changes |
| v0.1.26   | Add functional merge button for admin |
| v0.1.25   | Fix datesort on meter history, give techs limited well management |
| v0.1.24   | Add non-functional merge button for initial testing |
| v0.1.23   | Prevent duplicate activities from being added |
| v0.1.22   | Change ownership so there is now water_users and meter_owner |
| v0.1.21   | Implement Degrees Minutes Seconds (DMS) for lat/long |
| v0.1.20   | Fix monitoring wells sort |
| v0.1.19   | Updated OSE endpoint to have activity_id, reorganized data returned |
| v0.1.18   | Only require well on install activity, display OSE tag |
| v0.1.17   | Restructure security code to prevent database connection problems |
| v0.1.16   | Fixed bug where status is changed when clearing well from meter |
| v0.1.15   | Updated backend to use SQLAlchemy 2 (resolve connection issue?) |
| v0.1.14   | Display RA number instead of well name, well distance is now observation, new default observations |
| v0.1.13   | Add checkbox for sharing activities with OSE |
| v0.1.12   | Change lat/long to DMS, reorder observation inputs, block out of order activities |
| v0.1.11   | Remove all async code to see if it fixes deadlock issue |
| v0.1.10   | Fix owners and osetag on Wells page |
| v0.1.9    | Add owners to Meters table, fix various bugs |
| v0.1.8    | Fix bug in meter selection autocomplete |
| v0.1.7    | Fixed bugs in Add Meter |
| v0.1.6    | Various fixes and meter search via map UI |
| v0.1.5    | Various minor bug fixes |
| v0.1.4    | Updated "current installation" section of activities to match Meters page |
| v0.1.3    | Added user admin, improved appearance, fixed OSE endpoint scope |
| v0.1.2    | Added an initial parts inventory and minor meter installation UI improvements |
| v0.1.1    | Initial version with new clean database |
| v0.0.0    | Initial minimum viable product |
