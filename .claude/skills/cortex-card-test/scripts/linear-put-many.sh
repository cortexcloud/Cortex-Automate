#!/usr/bin/env bash
# อัปโหลดหลายไฟล์พร้อมกันไป signed URL ของ Linear (ชุดละไม่เกิน ~4 ไฟล์ ให้ทัน 60 วินาที) — เรียก linear-put.sh ทีละคู่แบบขนาน
# ใช้ (รันในโฟลเดอร์ของไฟล์): linear-put-many.sh <ไฟล์ 1> "<url 1>" <ไฟล์ 2> "<url 2>" …   · ไฟล์ .webm ส่งเป็น video/webm ที่เหลือ image/png
# ทุกไฟล์ต้องได้ 200 — ตัวไหนไม่ได้ ให้ prepare_attachment_upload ของไฟล์นั้นใหม่
put="$(dirname "$0")/linear-put.sh"
while [ $# -ge 2 ]; do
  file="$1"; url="$2"; shift 2
  case "$file" in *.webm) type="video/webm" ;; *.pdf) type="application/pdf" ;; *) type="image/png" ;; esac
  "$put" "$file" "$url" "$type" &
done
wait
