# MoPH Refer UAT mock payloads

All files use `his_id` `ea80c6fd-718d-494e-b3a3-9d3ab641358f`, origin `C0016` → destination `10661`.

Files `0062/69` onward use origin `22810`. `send-refer.mjs` sends every file with origin `22810` unless `--origin=` is given.

`patient_type`: 1 general, 2 accident, 3 emergency (non-accident). `emergency`: 1 life-threatening … 5 non-acute.

| File | patient_type | emergency | setting | coverage | patient | ICD-10 | summary |
|---|---|---|---|---|---|---|---|
| moph-refer-uat-0017-69-trauma-tbi-motorcycle.json | 2 | 1 | IPD | UCS | นายณัฐวุฒิ แสงทอง | S06.5 | Severe traumatic brain injury (GCS 8) with acute SDH right, midline shift |
| moph-refer-uat-0018-69-trauma-blunt-abdomen-car-crash.json | 2 | 1 | IPD | SSS | นางวิไลวรรณ ศรีสุข | S36.0 | Blunt abdominal trauma with hemoperitoneum, suspected splenic injury grade IV |
| moph-refer-uat-0019-69-trauma-fall-from-height-femur-pelvis.json | 2 | 2 | IPD | SSS | นายสมศักดิ์ บุญมา | S72.3 | Closed fracture shaft of right femur |
| moph-refer-uat-0020-69-trauma-stab-wound-hemothorax.json | 2 | 1 | IPD | UCS | นายอนุชา ทองดี | S27.1 | Stab wound left chest with massive hemothorax |
| moph-refer-uat-0021-69-trauma-burn-30-tbsa.json | 2 | 2 | IPD | SSS | นายประเสริฐ คงมั่น | T31.3 | 2nd-3rd degree burn 30% TBSA (face, anterior trunk, both arms) with suspected inhalation injury |
| moph-refer-uat-0022-69-trauma-elderly-fall-hip-fracture.json | 2 | 3 | IPD | OFC | นางบุญเรือน จันทร์หอม | S72.0 | Fracture neck of left femur (Garden IV) |
| moph-refer-uat-0023-69-trauma-hand-laceration-dog-bite.json | 2 | 4 | OPD | UCS | ด.ช.ภูมิพัฒน์ รักษ์ไทย | S61.9 | Dog bite right hand, WHO category III exposure |
| moph-refer-uat-0024-69-trauma-near-drowning-child.json | 2 | 2 | IPD | UCS | ด.ญ.ปุณยวีร์ มีสุข | T75.1 | Drowning and nonfatal submersion with aspiration pneumonitis |
| moph-refer-uat-0025-69-trauma-snake-bite-pit-viper.json | 2 | 2 | IPD | LGO | นายสุรชัย พรหมมา | T63.0 | Malayan pit viper bite left ankle with systemic bleeding (VCT > 20 min) |
| moph-refer-uat-0026-69-fasttrack-stemi.json | 3 | 1 | IPD | SSS | นายวีระพงษ์ เจริญผล | I21.0 | Acute anterior wall STEMI, Killip I, door-to-EKG 8 min |
| moph-refer-uat-0027-69-fasttrack-acute-ischemic-stroke.json | 3 | 1 | IPD | OFC | นางสุนทรี วงศ์ใหญ่ | I63.9 | Acute ischemic stroke left MCA territory, NIHSS 14, onset 60 min |
| moph-refer-uat-0028-69-fasttrack-septic-shock-pneumonia.json | 3 | 1 | IPD | UCS | นายชาญ สายสุวรรณ | A41.9 | Septic shock from community-acquired pneumonia RLL |
| moph-refer-uat-0029-69-fasttrack-dka.json | 3 | 2 | IPD | UCS | น.ส.กมลชนก สุวรรณรัตน์ | E10.1 | Diabetic ketoacidosis, severe |
| moph-refer-uat-0030-69-fasttrack-upper-gi-bleeding.json | 3 | 2 | IPD | OFC | นายธนากร แก้วมณี | I85.0 | Upper GI bleeding, suspected esophageal variceal bleeding |
| moph-refer-uat-0031-69-fasttrack-anaphylaxis.json | 3 | 1 | OPD | SSS | น.ส.พิมพ์ชนก ศรีวงศ์ | T78.0 | Anaphylaxis due to shellfish (grade 3) |
| moph-refer-uat-0032-69-fasttrack-status-epilepticus.json | 3 | 1 | IPD | UCS | นายกิตติศักดิ์ ปานทอง | G41.0 | Generalized convulsive status epilepticus due to antiepileptic non-adherence |
| moph-refer-uat-0033-69-fasttrack-ruptured-ectopic-pregnancy.json | 3 | 1 | IPD | SSS | นางศิริพร ใจงาม | O00.1 | Ruptured right tubal ectopic pregnancy with hemoperitoneum |
| moph-refer-uat-0034-69-fasttrack-pediatric-severe-asthma.json | 3 | 2 | IPD | UCS | ด.ช.ธนภัทร อินทร์แก้ว | J46 | Acute severe asthma exacerbation not responding to 3 doses of bronchodilator |
| moph-refer-uat-0035-69-fasttrack-organophosphate-poisoning.json | 3 | 1 | IPD | UCS | นายเอกชัย นาคสวัสดิ์ | T60.0 | Organophosphate poisoning (chlorpyrifos) with cholinergic crisis |
| moph-refer-uat-0036-69-general-ckd-uremia-hemodialysis.json | 1 | 3 | IPD | UCS | นางสมจิตร ทองประเสริฐ | N18.5 | CKD stage 5 with uremic syndrome and hyperkalemia |
| moph-refer-uat-0037-69-general-diabetic-foot-ulcer.json | 1 | 4 | OPD | LGO | นายบุญส่ง มั่นคง | E11.5 | Diabetic foot ulcer right plantar, Wagner grade 2, mild infection |
| moph-refer-uat-0038-69-general-dengue-warning-signs.json | 1 | 3 | IPD | UCS | น.ส.ชนิดา พึ่งบุญ | A91 | Dengue hemorrhagic fever with warning signs, critical phase day 1 |
| moph-refer-uat-0039-69-general-elderly-pneumonia.json | 1 | 3 | IPD | OFC | นายประยูร ศักดิ์ศรี | J18.9 | Community-acquired pneumonia LLL, CURB-65 3 |
| moph-refer-uat-0040-69-general-breast-cancer-chemo.json | 1 | 5 | OPD | UCS | นางรัตนา เพชรรัตน์ | C50.9 | Carcinoma of right breast pT2N1M0 (stage IIB), post MRM |
| moph-refer-uat-0041-69-general-cataract-surgery.json | 1 | 5 | OPD | OFC | นายสมพงษ์ วิเศษสุข | H25.9 | Senile mature cataract right eye, immature cataract left eye |
| moph-refer-uat-0042-69-trauma-open-fracture-tibia-motorcycle.json | 2 | 2 | IPD | UCS | นายธีรวัฒน์ ศรีประเสริฐ | S82.2 | Open fracture both bones of right leg, Gustilo type IIIA |
| moph-refer-uat-0043-69-trauma-cervical-spine-injury-diving.json | 2 | 1 | IPD | SSS | นายพงศกร อ่อนละมัย | S14.1 | Cervical spinal cord injury, C5-C6 fracture-dislocation, ASIA A, neurogenic shock |
| moph-refer-uat-0044-69-trauma-finger-amputation-machine.json | 2 | 2 | IPD | SSS | นายสมบัติ แก้วกาญจน์ | S68.2 | Traumatic amputation of left index and middle fingers at proximal phalanx level, ischemic time 50 min |
| moph-refer-uat-0045-69-fasttrack-acute-aortic-dissection.json | 3 | 1 | IPD | OFC | นายวิโรจน์ ธรรมรักษ์ | I71.0 | Suspected acute aortic dissection, Stanford type A |
| moph-refer-uat-0046-69-fasttrack-hemorrhagic-stroke.json | 3 | 1 | IPD | UCS | นางลำดวน พรมสุวรรณ | I61.9 | Acute stroke, suspected left basal ganglia hemorrhage, GCS E2VTM5 |
| moph-refer-uat-0047-69-fasttrack-eclampsia-ga34.json | 3 | 1 | IPD | SSS | นางอรทัย บัวขาว | O15.0 | Eclampsia, G1P0 GA 34 wk, suspected HELLP syndrome |
| moph-refer-uat-0048-69-fasttrack-pediatric-severe-dehydration-shock.json | 3 | 2 | IPD | UCS | ด.ญ.ณิชาภัทร ทองคำ | A08.0 | Acute rotaviral gastroenteritis with severe dehydration and hypovolemic shock |
| moph-refer-uat-0049-69-general-acute-appendicitis.json | 1 | 3 | IPD | UCS | น.ส.ปาริชาต นิลวงศ์ | K35.8 | Acute appendicitis, Alvarado score 8 |
| moph-refer-uat-0050-69-general-bph-acute-urinary-retention.json | 1 | 4 | OPD | OFC | นายสำราญ อินทรสุข | N40 | Benign prostatic hyperplasia with acute urinary retention |
| moph-refer-uat-0051-69-general-lumbar-disc-herniation.json | 1 | 5 | OPD | LGO | นางจันทร์เพ็ญ ศรีสวัสดิ์ | M51.1 | Lumbar disc herniation L4-L5 with left L5 radiculopathy, failed conservative treatment |
| moph-refer-uat-0052-69-trauma-pneumothorax-rib-fracture-fall.json | 2 | 2 | IPD | UCS | นายสุรเชษฐ์ วงศ์สวัสดิ์ | S27.0 | Right traumatic pneumothorax with fracture of right 5th-7th ribs, post ICD insertion |
| moph-refer-uat-0053-69-trauma-penetrating-eye-injury-grinder.json | 2 | 2 | IPD | SSS | นายอดิศักดิ์ ภูมิพันธ์ | S05.2 | Penetrating injury of left eyeball with corneal laceration and iris prolapse |
| moph-refer-uat-0054-69-trauma-pediatric-supracondylar-fracture.json | 2 | 3 | IPD | UCS | ด.ช.กฤตภาส สุขเกษม | S42.4 | Closed supracondylar fracture of right humerus, Gartland type III |
| moph-refer-uat-0055-69-fasttrack-acute-pulmonary-embolism.json | 3 | 1 | IPD | SSS | นางพัชรินทร์ จันทร์แจ่ม | I26.9 | Acute pulmonary embolism, intermediate-high risk, with right leg DVT |
| moph-refer-uat-0056-69-fasttrack-postpartum-hemorrhage-uterine-atony.json | 3 | 1 | IPD | UCS | นางกนกวรรณ ใจซื่อ | O72.1 | Immediate postpartum hemorrhage from uterine atony, EBL 1,500 ml, hypovolemic shock class III |
| moph-refer-uat-0057-69-fasttrack-acute-bacterial-meningitis.json | 3 | 2 | IPD | UCS | นายภาณุวัฒน์ เรืองศรี | G00.9 | Acute bacterial meningitis, suspected otogenic source |
| moph-refer-uat-0058-69-fasttrack-complete-heart-block.json | 3 | 1 | IPD | OFC | นายประสิทธิ์ ชัยมงคล | I44.2 | Complete AV block with Stokes-Adams attack |
| moph-refer-uat-0059-69-general-acute-calculous-cholecystitis.json | 1 | 3 | IPD | LGO | นางสายสุนีย์ มณีรัตน์ | K80.0 | Acute calculous cholecystitis, Tokyo grade I |
| moph-refer-uat-0060-69-general-thyroid-nodule-suspected-cancer.json | 1 | 5 | OPD | SSS | น.ส.ธิดารัตน์ คำแสน | E04.1 | Solitary right thyroid nodule 2.4 cm, TI-RADS 5, suspected papillary thyroid carcinoma |
| moph-refer-uat-0061-69-general-infant-vsd-heart-failure.json | 1 | 4 | OPD | UCS | ด.ช.ปัณณวิชญ์ ศรีจันทร์ | Q21.0 | Suspected ventricular septal defect with heart failure, failure to thrive |
| moph-refer-uat-0062-69-fasttrack-copd-exacerbation-respiratory-failure.json | 3 | 2 | IPD | UCS | นายบุญเลิศ พานทอง | J44.1 | COPD with acute exacerbation, acute hypercapnic respiratory failure |
| moph-refer-uat-0063-69-trauma-distal-radius-fracture-fall.json | 2 | 4 | OPD | SSS | น.ส.วรรณิศา ทองอินทร์ | S52.5 | Closed intra-articular fracture of right distal radius with dorsal angulation |
| moph-refer-uat-0064-69-general-ureteric-stone-obstructive-pyelonephritis.json | 1 | 3 | IPD | OFC | นายเกรียงไกร สมบูรณ์ทรัพย์ | N20.1 | Left distal ureteric calculus 9 mm with obstructive pyelonephritis and acute kidney injury |
| moph-refer-uat-0065-69-general-uterine-myoma-menorrhagia-anemia.json | 1 | 4 | OPD | LGO | นางสุภาวดี แสนคำ | D25.9 | Uterine leiomyoma 7 cm with menorrhagia and iron deficiency anemia |
| moph-refer-uat-0066-69-trauma-high-voltage-electrical-injury.json | 2 | 2 | IPD | SSS | นายจักรพันธ์ ดวงแก้ว | T75.4 | High-voltage electrical injury with entry wound right hand and exit wound left foot, 8% TBSA deep burn, rhabdomyolysis |
| moph-refer-uat-0067-69-trauma-achilles-tendon-rupture-badminton.json | 2 | 4 | OPD | OFC | นายธนพล วัฒนศิริ | S86.0 | Complete rupture of right Achilles tendon |
| moph-refer-uat-0068-69-trauma-pediatric-foreign-body-aspiration.json | 2 | 2 | IPD | UCS | ด.ช.ภูริณัฐ จันทร์ดี | T17.5 | Foreign body aspiration (peanut) in right main bronchus with air trapping |
| moph-refer-uat-0069-69-fasttrack-acute-cardiogenic-pulmonary-edema.json | 3 | 1 | IPD | UCS | นางทองใบ สีหานาม | I50.1 | Acute cardiogenic pulmonary edema with hypertensive crisis |
| moph-refer-uat-0070-69-fasttrack-hyperosmolar-hyperglycemic-state.json | 3 | 2 | IPD | LGO | นายสมหมาย กองแก้ว | E11.0 | Hyperosmolar hyperglycemic state precipitated by pneumonia |
| moph-refer-uat-0071-69-fasttrack-severe-acute-pancreatitis.json | 3 | 2 | IPD | SSS | นายอำนาจ ศรีบุญเรือง | K85.9 | Acute severe pancreatitis (alcohol and hypertriglyceridemia), BISAP 3, acute kidney injury |
| moph-refer-uat-0072-69-fasttrack-placenta-previa-antepartum-hemorrhage.json | 3 | 1 | IPD | SSS | นางเบญจมาศ พลเยี่ยม | O44.1 | Placenta previa totalis with antepartum hemorrhage, G3P2 GA 32 wk, previous cesarean section x2 (suspected placenta accreta spectrum) |
| moph-refer-uat-0073-69-general-pediatric-chronic-tonsillitis-osa.json | 1 | 5 | OPD | UCS | ด.ญ.พิชญาภา วงค์คำ | J35.0 | Chronic tonsillitis with adenotonsillar hypertrophy, suspected obstructive sleep apnea |
| moph-refer-uat-0074-69-general-inguinal-hernia-elective-repair.json | 1 | 5 | OPD | OFC | นายวิชิต เพ็งสว่าง | K40.9 | Right indirect inguinal hernia, reducible |
| moph-refer-uat-0075-69-general-graves-disease-uncontrolled.json | 1 | 4 | OPD | UCS | น.ส.ชุติกาญจน์ มูลสาร | E05.0 | Graves' disease with uncontrolled thyrotoxicosis and Graves' ophthalmopathy, poor response to antithyroid drug |
| moph-refer-uat-0076-69-trauma-inmate-stab-wound-abdomen.json | 2 | 1 | IPD | UCS | นายอนุวัฒน์ บุญประคอง | S31.1 | Penetrating stab wound of left upper abdomen with omental evisceration, suspected hollow viscus injury, hypovolemic shock class II |
| moph-refer-uat-0077-69-trauma-inmate-mandible-fracture-assault.json | 2 | 3 | IPD | UCS | นายสิทธิชัย แสงอรุณ | S02.6 | Suspected fracture of left parasymphysis of mandible with malocclusion from assault |
| moph-refer-uat-0078-69-trauma-inmate-near-hanging.json | 2 | 1 | IPD | UCS | นายวรากร ทิพย์มณี | T71 | Near-hanging with hypoxic encephalopathy, GCS 6, post endotracheal intubation |
| moph-refer-uat-0079-69-fasttrack-inmate-exertional-heat-stroke.json | 3 | 1 | IPD | UCS | นายประจักษ์ อ่อนศรี | T67.0 | Exertional heat stroke with altered mental status and seizure, suspected rhabdomyolysis |
| moph-refer-uat-0080-69-fasttrack-inmate-alcohol-withdrawal-delirium.json | 3 | 2 | IPD | SSS | นายมานพ คงเจริญ | F10.4 | Alcohol withdrawal delirium (delirium tremens) with withdrawal seizure, CIWA-Ar 28 |
| moph-refer-uat-0081-69-fasttrack-inmate-pulmonary-tb-hemoptysis.json | 3 | 2 | IPD | UCS | นายสุชาติ พรหมจันทร์ | A15.0 | Smear-positive pulmonary tuberculosis with moderate hemoptysis, new case |
| moph-refer-uat-0082-69-fasttrack-inmate-hiv-pcp-respiratory-failure.json | 3 | 2 | IPD | UCS | นายเอกพล รุ่งเรืองศรี | B20.6 | Advanced HIV disease with suspected Pneumocystis pneumonia and acute hypoxemic respiratory failure |
| moph-refer-uat-0083-69-fasttrack-inmate-ludwig-angina-dental.json | 3 | 2 | IPD | UCS | น.ส.กัลยาณี โพธิ์ทอง | K12.2 | Ludwig's angina from odontogenic infection (tooth 37) with impending upper airway obstruction |
| moph-refer-uat-0084-69-general-inmate-chronic-hepatitis-c.json | 1 | 5 | OPD | UCS | นายไพโรจน์ นาคประเสริฐ | B18.2 | Chronic hepatitis C infection, APRI 1.8 (suspected significant fibrosis), treatment-naive |
| moph-refer-uat-0085-69-general-inmate-cervical-hsil-colposcopy.json | 1 | 5 | OPD | OFC | นางรัชนี สุขสำราญ | N87.9 | High-grade squamous intraepithelial lesion (HSIL) of cervix with HPV 16 infection |
