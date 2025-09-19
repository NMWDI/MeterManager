CREATE TABLE public."MeterActivityPhotos" (
    id serial PRIMARY KEY,
    meter_activity_id int4 NOT NULL REFERENCES public."MeterActivities"(id) ON DELETE CASCADE,
    file_name varchar NOT NULL,
    gcs_path varchar NOT NULL,
    uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_meter_activity_photos_activity_id
    ON public."MeterActivityPhotos"(meter_activity_id);
