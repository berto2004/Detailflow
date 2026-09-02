ALTER TABLE bookings ADD COLUMN service_id TEXT REFERENCES services(id);
CREATE INDEX bookings_service_idx ON bookings(service_id);
