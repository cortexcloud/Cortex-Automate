#!/usr/bin/env bash
# อัปโหลดไฟล์ไป signed URL ของ Linear (prepare_attachment_upload) — header ต้องตรงกับที่ Linear เซ็นไว้ทุกตัว
file="$1"; url="$2"; type="${3:-image/png}"; size=$(wc -c < "$file" | tr -d ' ')
curl -s -o /dev/null -w "$file → %{http_code}\n" -X PUT --data-binary "@$file" -H "content-type: $type" -H "cache-control: public, max-age=31536000" -H "x-goog-content-length-range: $size,$size" -H "Content-Disposition: attachment; filename=\"$file\"" "$url"
