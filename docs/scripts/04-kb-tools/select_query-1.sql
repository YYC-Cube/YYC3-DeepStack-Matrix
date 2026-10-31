SELECT content_hash, count(*) FROM kb_entries
GROUP BY content_hash HAVING count(*) > 1
ORDER BY count(*) DESC LIMIT 10;
