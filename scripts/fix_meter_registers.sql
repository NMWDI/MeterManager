-- Use to ensure each register has a row in the meter_registers table
select * from "Parts" where part_type_id = 17
and "Parts".id not in (select part_id from meter_registers where part_id is not null);

-- Insert missing meter registers
INSERT INTO meter_registers (
    brand,
    meter_size,
    part_id,
    ratio,
    dial_units_id,
    totalizer_units_id,
    number_of_digits,
    multiplier
) values ('Sensus', 0, 122, '', 1, 1, 0, 0), ('McCrometer', 9, 89, '1100:1', 12, 1, 6, 1);