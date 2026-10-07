-- Reference data required in every environment.

insert into public.location_type (name) values
  ('library'),
  ('cafe'),
  ('campus_building'),
  ('coworking'),
  ('restaurant'),
  ('park'),
  ('other');

insert into public.campus (name) values
  ('Northeastern University'),
  ('Boston University'),
  ('Harvard University'),
  ('MIT'),
  ('Boston College'),
  ('Tufts University'),
  ('Emerson College'),
  ('Suffolk University'),
  ('Berklee College of Music'),
  ('UMass Boston');

-- Ids match Google Places priceLevel ordering (FREE .. VERY_EXPENSIVE).
insert into public.price_range (price_range_id, label) values
  (0, 'Free'),
  (1, '$'),
  (2, '$$'),
  (3, '$$$'),
  (4, '$$$$');

insert into public.day (name) values
  ('Sunday'),
  ('Monday'),
  ('Tuesday'),
  ('Wednesday'),
  ('Thursday'),
  ('Friday'),
  ('Saturday');

insert into public.seat_type (name) values
  ('table'),
  ('desk'),
  ('booth'),
  ('couch'),
  ('armchair'),
  ('bar_seating'),
  ('study_room'),
  ('outdoor');

insert into public.capacity (capacity_id, label) values
  (1, 'Solo (1)'),
  (2, 'Small (2-4)'),
  (3, 'Medium (5-8)'),
  (4, 'Large (9+)');

insert into public.outlet_level (outlet_level_id, label) values
  (0, 'None'),
  (1, 'Few'),
  (2, 'Some'),
  (3, 'Plenty');

insert into public.crowd_level (crowd_level_id, label) values
  (1, 'Empty'),
  (2, 'Quiet'),
  (3, 'Moderate'),
  (4, 'Busy'),
  (5, 'Packed');

insert into public.noise_level (noise_level_id, label) values
  (1, 'Silent'),
  (2, 'Quiet'),
  (3, 'Moderate'),
  (4, 'Loud'),
  (5, 'Very loud');
