ALTER TABLE coaches ADD COLUMN coach_class VARCHAR(50) DEFAULT 'SECOND';

-- Default the existing coaches (1 is First, 2-3 are Second, 4 is Third - for example, or we can just update randomly to show UI, but let's do this:)
UPDATE coaches SET coach_class = 'FIRST' WHERE coach_number = 1;
UPDATE coaches SET coach_class = 'SECOND' WHERE coach_number IN (2, 3);
UPDATE coaches SET coach_class = 'THIRD' WHERE coach_number = 4;
