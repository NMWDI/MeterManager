CREATE EXTENSION IF NOT EXISTS fuzzystrmatch
WITH
    SCHEMA public;

COMMENT ON EXTENSION fuzzystrmatch IS 'determine similarities and distance between strings';

CREATE EXTENSION IF NOT EXISTS postgis
WITH
    SCHEMA public;

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';

CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder
WITH
    SCHEMA tiger;

COMMENT ON EXTENSION postgis_tiger_geocoder IS 'PostGIS tiger geocoder and reverse geocoder';

CREATE EXTENSION IF NOT EXISTS postgis_topology
WITH
    SCHEMA topology;

COMMENT ON EXTENSION postgis_topology IS 'PostGIS topology spatial types and functions';

CREATE TABLE IF NOT EXISTS public."ActivityTypeLU" (
    id integer PRIMARY KEY,
    name character varying,
    description character varying,
    permission character varying
);

CREATE TABLE IF NOT EXISTS public."Alerts" (
    id integer PRIMARY KEY,
    alert character varying,
    open_timestamp timestamp without time zone,
    closed_timestamp timestamp without time zone,
    meter_id integer
);

CREATE TABLE IF NOT EXISTS public."LandOwners" (
    id integer PRIMARY KEY,
    contact_name character varying,
    organization character varying,
    address character varying,
    city character varying,
    state character varying,
    zip character varying,
    phone character varying,
    mobile character varying,
    email character varying,
    note character varying
);

CREATE TABLE IF NOT EXISTS public."LocationTypeLU" (
    id integer PRIMARY KEY,
    type_name character varying,
    description character varying
);

CREATE TABLE IF NOT EXISTS public."Locations" (
    id integer PRIMARY KEY,
    name character varying,
    type_id integer NOT NULL,
    trss character varying,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    township integer,
    range integer,
    section integer,
    quarter integer,
    half_quarter integer,
    quarter_quarter integer,
    geom public.geometry (Point),
    land_owner_id integer
);

CREATE TABLE IF NOT EXISTS public."MeterActivities" (
    id integer PRIMARY KEY,
    timestamp_start timestamp without time zone NOT NULL,
    timestamp_end timestamp without time zone NOT NULL,
    description character varying,
    submitting_user_id integer,
    meter_id integer NOT NULL,
    activity_type_id integer NOT NULL,
    location_id integer NOT NULL,
    ose_share boolean DEFAULT false NOT NULL,
    water_users character varying,
    work_order_id integer
);

CREATE TABLE IF NOT EXISTS public."MeterObservations" (
    id integer PRIMARY KEY,
    "timestamp" timestamp without time zone NOT NULL,
    value double precision NOT NULL,
    notes character varying,
    submitting_user_id integer,
    meter_id integer NOT NULL,
    observed_property_type_id integer NOT NULL,
    unit_id integer NOT NULL,
    location_id integer NOT NULL,
    ose_share boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public."MeterStatusLU" (
    id integer PRIMARY KEY,
    status_name character varying,
    description character varying
);

CREATE TABLE IF NOT EXISTS public."MeterTypeLU" (
    id integer PRIMARY KEY,
    brand character varying,
    series character varying,
    model character varying,
    size double precision,
    description character varying,
    in_use boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS public."Meters" (
    id integer PRIMARY KEY,
    serial_number character varying NOT NULL,
    contact_name character varying,
    contact_phone character varying,
    notes character varying,
    meter_type_id integer NOT NULL,
    status_id integer NOT NULL,
    well_id integer,
    location_id integer,
    water_users character varying,
    meter_owner character varying,
    register_id integer
);

CREATE TABLE IF NOT EXISTS public."NoteTypeLU" (
    id integer PRIMARY KEY,
    note character varying,
    details character varying,
    slug character varying,
    commonly_used boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public."Notes" (
    meter_activity_id integer NOT NULL,
    note_type_id integer NOT NULL,
    id integer PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public."ObservedPropertyTypeLU" (
    id integer PRIMARY KEY,
    name character varying,
    description character varying,
    context character varying
);

CREATE TABLE IF NOT EXISTS public."PartAssociation" (
    id integer PRIMARY KEY,
    meter_type_id integer NOT NULL,
    part_id integer NOT NULL,
    commonly_used boolean
);

CREATE TABLE IF NOT EXISTS public."PartTypeLU" (
    id integer PRIMARY KEY,
    name character varying,
    description character varying
);

CREATE TABLE IF NOT EXISTS public."Parts" (
    id integer PRIMARY KEY,
    part_number character varying NOT NULL,
    part_type_id integer NOT NULL,
    description character varying,
    vendor character varying,
    count integer,
    note character varying,
    in_use boolean DEFAULT true NOT NULL,
    commonly_used boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public."PartsUsed" (
    meter_activity_id integer NOT NULL,
    part_id integer NOT NULL,
    count integer,
    id integer PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public."PropertyUnits" (
    property_id integer NOT NULL,
    unit_id integer NOT NULL,
    id integer PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public."QC" (
    id integer PRIMARY KEY,
    "timestamp" timestamp without time zone,
    status boolean
);

CREATE TABLE IF NOT EXISTS public."ScopesRoles" (
    security_scope_id integer NOT NULL,
    user_role_id integer NOT NULL,
    id integer PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public."ScreenIntervals" (
    id integer PRIMARY KEY,
    top double precision,
    bottom double precision,
    well_construction_id integer
);

CREATE TABLE IF NOT EXISTS public."SecurityScopes" (
    id integer PRIMARY KEY,
    scope_string character varying NOT NULL,
    description character varying
);

CREATE TABLE IF NOT EXISTS public."ServiceTypeLU" (
    id integer PRIMARY KEY,
    service_name character varying,
    description character varying
);

CREATE TABLE IF NOT EXISTS public."ServicesPerformed" (
    meter_activity_id integer NOT NULL,
    service_type_id integer NOT NULL,
    id integer PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public."Units" (
    id integer PRIMARY KEY,
    name character varying,
    name_short character varying,
    description character varying
);

CREATE TABLE IF NOT EXISTS public."UserRoles" (
    id integer PRIMARY KEY,
    name character varying NOT NULL
);

CREATE TABLE IF NOT EXISTS public."Users" (
    id integer PRIMARY KEY,
    username character varying NOT NULL,
    full_name character varying,
    email character varying,
    hashed_password character varying NOT NULL,
    disabled boolean,
    is_test_account boolean NOT NULL DEFAULT false,
    user_role_id integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public."WellConstructions" (
    id integer PRIMARY KEY,
    casing_diameter double precision,
    hole_depth double precision,
    well_depth double precision,
    well_id integer
);

CREATE TABLE IF NOT EXISTS public."WellMeasurements" (
    id integer PRIMARY KEY,
    "timestamp" timestamp without time zone NOT NULL,
    value double precision NOT NULL,
    observed_property_id integer NOT NULL,
    submitting_user_id integer,
    unit_id integer NOT NULL,
    well_id integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public."WellRights" (
    id integer PRIMARY KEY,
    well_id integer NOT NULL,
    ra_number character varying NOT NULL
);

CREATE TABLE IF NOT EXISTS public."WellUseLU" (
    id integer PRIMARY KEY,
    use_type character varying NOT NULL,
    code character varying,
    description character varying
);

CREATE TABLE IF NOT EXISTS public."Wells" (
    id integer PRIMARY KEY,
    name character varying,
    use_type_id integer,
    location_id integer,
    ra_number character varying,
    owners character varying,
    comments character varying,
    osetag character varying,
    water_source_id integer,
    well_status_id integer,
    casing character varying(30),
    total_depth double precision,
    outside_recorder boolean
);

CREATE TABLE IF NOT EXISTS public.meter_registers (
    id integer PRIMARY KEY,
    brand character varying(30) NOT NULL,
    meter_size numeric(3, 1) NOT NULL,
    part_id integer,
    ratio character varying(30),
    dial_units_id integer NOT NULL,
    totalizer_units_id integer NOT NULL,
    number_of_digits integer NOT NULL,
    multiplier double precision NOT NULL,
    notes character varying(100),
    decimal_digits integer
);

CREATE TABLE IF NOT EXISTS public.water_sources (
    id integer PRIMARY KEY,
    name character varying(255) NOT NULL,
    description text
);

CREATE TABLE IF NOT EXISTS public.well_status (
    id integer PRIMARY KEY,
    status character varying(50) NOT NULL,
    description text
);

CREATE TABLE IF NOT EXISTS public.work_order_status_lu (
    id integer PRIMARY KEY,
    name character varying(20) NOT NULL,
    description text
);

CREATE TABLE IF NOT EXISTS public.work_orders (
    id integer PRIMARY KEY,
    date_created date NOT NULL,
    creator character varying(30),
    title character varying(30) NOT NULL,
    description text,
    meter_id integer NOT NULL,
    status_id integer NOT NULL,
    notes text,
    assigned_user_id integer,
    ose_request_id integer,
    CONSTRAINT work_orders_title_check CHECK (LENGTH (title) > 0)
);
