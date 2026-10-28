-- One-time repair for an identity sequence behind existing menu IDs.
-- The lock prevents concurrent menu inserts while the table and sequence are aligned.
BEGIN;

LOCK TABLE public.tb_menu IN ACCESS EXCLUSIVE MODE;

WITH menu_state AS (
    SELECT COALESCE(MAX(menu_id), 1) AS max_menu_id, COUNT(*) > 0 AS has_menu
    FROM public.tb_menu
), sequence_state AS (
    SELECT last_value, is_called
    FROM public.tb_menu_menu_id_seq
)
SELECT setval(
    pg_get_serial_sequence('public.tb_menu', 'menu_id')::regclass,
    GREATEST(menu_state.max_menu_id, sequence_state.last_value),
    menu_state.has_menu OR sequence_state.is_called
)
FROM menu_state
CROSS JOIN sequence_state;

COMMIT;