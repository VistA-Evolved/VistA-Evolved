ZVESEED ;VE/KM - VistA-Evolved Comprehensive Seed Data;2026-03-10
 ;;1.0;VistA-Evolved;**1**;Mar 10, 2026;Build 1
 ;
 ; Purpose: Seeds a VistA distro instance with comprehensive reference data
 ;          across all core domains. Idempotent -- safe to run multiple times.
 ;
 ; Entry points:
 ;   EN^ZVESEED        - Full seed pipeline (all domains)
 ;   PATIENTS^ZVESEED  - Seed test patients (File #2)
 ;   PROVIDERS^ZVESEED - Seed providers (File #200)
 ;   CLINICS^ZVESEED   - Seed clinics (File #44)
 ;   WARDS^ZVESEED     - Seed wards (File #42)
 ;   DRUGS^ZVESEED     - Seed drugs (File #50)
 ;   LABTESTS^ZVESEED  - Seed lab tests (File #60)
 ;   RADPROCS^ZVESEED  - Seed rad procedures (File #71)
 ;   INSCOS^ZVESEED    - Seed insurance companies (File #355.3)
 ;   ICDCODES^ZVESEED  - Seed ICD-10 codes
 ;   VERIFY^ZVESEED    - Verify seed data counts
 ;
 ; *** DEV/DEMO ONLY - NOT FOR PRODUCTION ***
 ;
 Q
 ;
EN ; Full seed pipeline
 W !,"=============================================="
 W !," VistA-Evolved Comprehensive Seed Data"
 W !," *** DEV/DEMO ONLY ***"
 W !,"=============================================="
 ;
 D CLINICS
 D WARDS
 D PROVIDERS
 D PATIENTS
 D DRUGS
 D LABTESTS
 D RADPROCS
 D INSCOS
 D ICDCODES
 ;
 W !,!,"=============================================="
 W !," Seed Pipeline Complete"
 W !,"=============================================="
 D VERIFY
 Q
 ;
CLINICS ; Seed clinics in File #44 (Hospital Location)
 W !,!,"--- Seeding Clinics (File #44) ---"
 N DATA,I,LINE,NAME,ABBR,STOP,TYP
 ;
 F I=1:1 S LINE=$P($T(CLDATA+I),";;",2) Q:LINE="END"  D
 . S NAME=$P(LINE,"^",1)
 . S ABBR=$P(LINE,"^",2)
 . S STOP=$P(LINE,"^",3)
 . S TYP=$P(LINE,"^",4)
 . D ADDCLIN(NAME,ABBR,STOP,TYP)
 Q
 ;
ADDCLIN(NAME,ABBR,STOP,TYP) ; Add one clinic if not exists
 N IEN
 S IEN=$O(^SC("B",NAME,""))
 I IEN>0 Q
 ;
 N FDA,ERR
 S FDA(44,"+1,",.01)=NAME
 S FDA(44,"+1,",2)=$S($G(TYP)'="":TYP,1:"C")
 I $G(STOP)'="" S FDA(44,"+1,",8)=STOP
 D UPDATE^DIE("","FDA","","ERR")
 I $D(ERR) W !,"  ERROR adding clinic "_NAME Q
 W !,"  Added clinic: "_NAME
 Q
 ;
WARDS ; Seed wards in File #42 (Ward Location)
 W !,!,"--- Seeding Wards (File #42) ---"
 N I,LINE,NAME,BEDS
 ;
 F I=1:1 S LINE=$P($T(WDDATA+I),";;",2) Q:LINE="END"  D
 . S NAME=$P(LINE,"^",1)
 . S BEDS=$P(LINE,"^",2)
 . D ADDWARD(NAME,BEDS)
 Q
 ;
ADDWARD(NAME,BEDS) ; Add one ward if not exists
 N IEN
 S IEN=$O(^DIC(42,"B",NAME,""))
 I IEN>0 Q
 ;
 N FDA,ERR
 S FDA(42,"+1,",.01)=NAME
 I $G(BEDS)'="" S FDA(42,"+1,",.1)=BEDS
 D UPDATE^DIE("","FDA","","ERR")
 I $D(ERR) W !,"  ERROR adding ward "_NAME Q
 W !,"  Added ward: "_NAME
 Q
 ;
PROVIDERS ; Seed providers in File #200 (New Person)
 W !,!,"--- Seeding Providers (File #200) ---"
 ; Only seed if fewer than 5 active providers exist
 N CNT,IEN S CNT=0,IEN=0
 F  S IEN=$O(^VA(200,IEN)) Q:IEN'>0  D
 . N DIS S DIS=$$GET1^DIQ(200,IEN,.01)
 . I DIS'="" S CNT=CNT+1
 I CNT>4 W !,"  "_CNT_" providers already exist -- skipping." Q
 ;
 W !,"  Provider seeding requires manual configuration."
 W !,"  Use ZVEUSER.m to manage provider accounts."
 Q
 ;
PATIENTS ; Seed test patients in File #2 (Patient)
 W !,!,"--- Seeding Patients (File #2) ---"
 N CNT,IEN S CNT=0,IEN=0
 F  S IEN=$O(^DPT(IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Existing patients: "_CNT
 I CNT>5 W !,"  Sufficient patients exist -- skipping." Q
 ;
 N I,LINE,NAME,DOB,SSN
 F I=1:1 S LINE=$P($T(PTDATA+I),";;",2) Q:LINE="END"  D
 . S NAME=$P(LINE,"^",1)
 . S DOB=$P(LINE,"^",2)
 . S SSN=$P(LINE,"^",3)
 . D ADDPT(NAME,DOB,SSN)
 Q
 ;
ADDPT(NAME,DOB,SSN) ; Add one patient if not exists
 N IEN
 S IEN=$O(^DPT("B",NAME,""))
 I IEN>0 Q
 ;
 N FDA,ERR,NEWIEN
 S FDA(2,"+1,",.01)=NAME
 I $G(DOB)'="" S FDA(2,"+1,",.03)=DOB
 I $G(SSN)'="" S FDA(2,"+1,",.09)=SSN
 S FDA(2,"+1,",.02)="MALE"
 D UPDATE^DIE("","FDA","NEWIEN","ERR")
 I $D(ERR) W !,"  ERROR adding patient "_NAME Q
 W !,"  Added patient: "_NAME_" (DFN="_$G(NEWIEN(1))_")"
 Q
 ;
DRUGS ; Seed drugs in File #50 (Drug)
 W !,!,"--- Seeding Drugs (File #50) ---"
 N CNT,IEN S CNT=0,IEN=0
 F  S IEN=$O(^PSDRUG(IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Existing drugs: "_CNT
 I CNT>10 W !,"  Sufficient drugs exist -- skipping." Q
 ;
 N I,LINE,NAME,CLASS
 F I=1:1 S LINE=$P($T(RXDATA+I),";;",2) Q:LINE="END"  D
 . S NAME=$P(LINE,"^",1)
 . S CLASS=$P(LINE,"^",2)
 . D ADDRX(NAME,CLASS)
 Q
 ;
ADDRX(NAME,CLASS) ; Add one drug
 N IEN
 S IEN=$O(^PSDRUG("B",NAME,""))
 I IEN>0 Q
 ;
 N FDA,ERR
 S FDA(50,"+1,",.01)=NAME
 I $G(CLASS)'="" S FDA(50,"+1,",2)=CLASS
 D UPDATE^DIE("","FDA","","ERR")
 I $D(ERR) W !,"  ERROR adding drug "_NAME Q
 W !,"  Added drug: "_NAME
 Q
 ;
LABTESTS ; Seed lab tests in File #60 (Laboratory Test)
 W !,!,"--- Seeding Lab Tests (File #60) ---"
 N CNT,IEN S CNT=0,IEN=0
 F  S IEN=$O(^LAB(60,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Existing lab tests: "_CNT
 I CNT>10 W !,"  Sufficient lab tests exist -- skipping." Q
 ;
 N I,LINE,NAME,TYP
 F I=1:1 S LINE=$P($T(LBDATA+I),";;",2) Q:LINE="END"  D
 . S NAME=$P(LINE,"^",1)
 . S TYP=$P(LINE,"^",2)
 . D ADDLAB(NAME,TYP)
 Q
 ;
ADDLAB(NAME,TYP) ; Add one lab test
 N IEN
 S IEN=$O(^LAB(60,"B",NAME,""))
 I IEN>0 Q
 ;
 N FDA,ERR
 S FDA(60,"+1,",.01)=NAME
 I $G(TYP)'="" S FDA(60,"+1,",2)=TYP
 D UPDATE^DIE("","FDA","","ERR")
 I $D(ERR) W !,"  ERROR adding lab test "_NAME Q
 W !,"  Added lab test: "_NAME
 Q
 ;
RADPROCS ; Seed radiology procedures in File #71
 W !,!,"--- Seeding Rad Procedures (File #71) ---"
 N CNT,IEN S CNT=0,IEN=0
 F  S IEN=$O(^RAMIS(71,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Existing rad procedures: "_CNT
 I CNT>5 W !,"  Sufficient rad procedures exist -- skipping." Q
 ;
 N I,LINE,NAME,TYP
 F I=1:1 S LINE=$P($T(RDDATA+I),";;",2) Q:LINE="END"  D
 . S NAME=$P(LINE,"^",1)
 . S TYP=$P(LINE,"^",2)
 . D ADDRAD(NAME,TYP)
 Q
 ;
ADDRAD(NAME,TYP) ; Add one radiology procedure
 N IEN
 S IEN=$O(^RAMIS(71,"B",NAME,""))
 I IEN>0 Q
 ;
 N FDA,ERR
 S FDA(71,"+1,",.01)=NAME
 I $G(TYP)'="" S FDA(71,"+1,",2)=TYP
 D UPDATE^DIE("","FDA","","ERR")
 I $D(ERR) W !,"  ERROR adding rad proc "_NAME Q
 W !,"  Added rad procedure: "_NAME
 Q
 ;
INSCOS ; Seed insurance companies in File #355.3
 W !,!,"--- Seeding Insurance Companies (File #355.3) ---"
 N CNT,IEN S CNT=0,IEN=0
 F  S IEN=$O(^DIC(355.3,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Existing insurance cos: "_CNT
 I CNT>5 W !,"  Sufficient insurance cos exist -- skipping." Q
 ;
 N I,LINE,NAME
 F I=1:1 S LINE=$P($T(INDATA+I),";;",2) Q:LINE="END"  D
 . S NAME=$P(LINE,"^",1)
 . D ADDINS(NAME)
 Q
 ;
ADDINS(NAME) ; Add one insurance company
 N IEN
 S IEN=$O(^DIC(355.3,"B",NAME,""))
 I IEN>0 Q
 ;
 N FDA,ERR
 S FDA(355.3,"+1,",.01)=NAME
 D UPDATE^DIE("","FDA","","ERR")
 I $D(ERR) W !,"  ERROR adding ins co "_NAME Q
 W !,"  Added insurance co: "_NAME
 Q
 ;
ICDCODES ; Seed ICD-10 diagnosis codes
 W !,!,"--- Seeding ICD-10 Codes ---"
 W !,"  ICD codes are loaded from VistA-M globals. Checking..."
 N CNT,IEN S CNT=0,IEN=""
 F  S IEN=$O(^ICD9(IEN)) Q:IEN=""  S CNT=CNT+1 Q:CNT>100
 I CNT>100 W !,"  "_CNT_"+ ICD codes present -- OK." Q
 W !,"  "_CNT_" ICD codes found. May need VistA-M globals load."
 Q
 ;
VERIFY ; Verify seed data counts
 W !,!,"=============================================="
 W !,"  Seed Data Verification"
 W !,"=============================================="
 N CNT,IEN
 ;
 ; Clinics
 S CNT=0,IEN=0
 F  S IEN=$O(^SC(IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Clinics (File #44):          "_CNT
 ;
 ; Wards
 S CNT=0,IEN=0
 F  S IEN=$O(^DIC(42,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Wards (File #42):            "_CNT
 ;
 ; Providers
 S CNT=0,IEN=0
 F  S IEN=$O(^VA(200,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Users (File #200):           "_CNT
 ;
 ; Patients
 S CNT=0,IEN=0
 F  S IEN=$O(^DPT(IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Patients (File #2):          "_CNT
 ;
 ; Drugs
 S CNT=0,IEN=0
 F  S IEN=$O(^PSDRUG(IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Drugs (File #50):            "_CNT
 ;
 ; Lab Tests
 S CNT=0,IEN=0
 F  S IEN=$O(^LAB(60,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Lab Tests (File #60):        "_CNT
 ;
 ; Rad Procedures
 S CNT=0,IEN=0
 F  S IEN=$O(^RAMIS(71,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Rad Procedures (File #71):   "_CNT
 ;
 ; Insurance
 S CNT=0,IEN=0
 F  S IEN=$O(^DIC(355.3,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Insurance Cos (File #355.3): "_CNT
 ;
 ; RPCs
 S CNT=0,IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  RPCs (File #8994):           "_CNT
 ;
 ; Options
 S CNT=0,IEN=0
 F  S IEN=$O(^DIC(19,IEN)) Q:IEN'>0  S CNT=CNT+1
 W !,"  Options (File #19):          "_CNT
 ;
 W !,"=============================================="
 Q
 ;
 ; ---- DATA SECTIONS ----
 ; Format: NAME^ABBR^STOPCODE^TYPE
CLDATA ;
 ;;PRIMARY CARE^PC^301^C
 ;;INTERNAL MEDICINE^IM^301^C
 ;;CARDIOLOGY^CARD^303^C
 ;;PULMONOLOGY^PULM^304^C
 ;;GASTROENTEROLOGY^GI^305^C
 ;;ENDOCRINOLOGY^ENDO^306^C
 ;;RHEUMATOLOGY^RHEUM^307^C
 ;;NEPHROLOGY^NEPH^308^C
 ;;NEUROLOGY^NEURO^315^C
 ;;DERMATOLOGY^DERM^316^C
 ;;OPHTHALMOLOGY^EYE^310^C
 ;;ORTHOPEDICS^ORTHO^311^C
 ;;UROLOGY^URO^312^C
 ;;GENERAL SURGERY^SURG^401^C
 ;;MENTAL HEALTH^MH^502^C
 ;;PSYCHIATRY^PSYCH^505^C
 ;;PSYCHOLOGY^PSYCH^510^C
 ;;EMERGENCY DEPARTMENT^ED^130^C
 ;;URGENT CARE^UC^131^C
 ;;WOMEN HEALTH^WH^322^C
 ;;AUDIOLOGY^AUD^203^C
 ;;DENTAL^DENT^180^C
 ;;NUTRITION^NUT^123^C
 ;;SOCIAL WORK^SW^125^C
 ;;PHARMACY^PHAR^160^C
 ;;LABORATORY^LAB^108^C
 ;;RADIOLOGY^RAD^105^C
 ;;PHYSICAL THERAPY^PT^209^C
 ;;OCCUPATIONAL THERAPY^OT^210^C
 ;;TELEHEALTH^TLHLT^679^C
 ;;END
 ;
WDDATA ; Ward data: NAME^BEDS
 ;;MEDICAL WARD 1A^30
 ;;MEDICAL WARD 1B^30
 ;;SURGICAL WARD 2A^25
 ;;SURGICAL WARD 2B^25
 ;;ICU^12
 ;;CCU^8
 ;;STEP DOWN UNIT^15
 ;;PSYCHIATRIC WARD^20
 ;;REHABILITATION WARD^20
 ;;OBSERVATION UNIT^10
 ;;END
 ;
PTDATA ; Patient data: NAME^DOB^SSN
 ;;SMITH,JOHN A^2600101^000000001
 ;;JONES,MARY B^2550315^000000002
 ;;WILLIAMS,ROBERT C^2700520^000000003
 ;;BROWN,SARAH D^2680712^000000004
 ;;DAVIS,MICHAEL E^2580930^000000005
 ;;WILSON,JENNIFER F^2720415^000000006
 ;;MARTINEZ,CARLOS G^2650825^000000007
 ;;ANDERSON,PATRICIA H^2710110^000000008
 ;;TAYLOR,JAMES I^2561222^000000009
 ;;THOMAS,LINDA J^2690608^000000010
 ;;END
 ;
RXDATA ; Drug data: NAME^CLASS
 ;;ASPIRIN TAB 325MG^AN100
 ;;METFORMIN TAB 500MG^HS502
 ;;LISINOPRIL TAB 10MG^CV800
 ;;AMLODIPINE TAB 5MG^CV200
 ;;METOPROLOL TAB 25MG^CV100
 ;;OMEPRAZOLE CAP 20MG^GA301
 ;;SERTRALINE TAB 50MG^CN609
 ;;GABAPENTIN CAP 300MG^CN400
 ;;LEVOTHYROXINE TAB 50MCG^HS851
 ;;ALBUTEROL INH 90MCG^RE110
 ;;PREDNISONE TAB 10MG^HS051
 ;;AMOXICILLIN CAP 500MG^AM111
 ;;HYDROCHLOROTHIAZIDE TAB 25MG^CV700
 ;;ATORVASTATIN TAB 20MG^CV350
 ;;WARFARIN TAB 5MG^BL110
 ;;INSULIN REGULAR INJ^HS501
 ;;FUROSEMIDE TAB 40MG^CV702
 ;;TRAMADOL TAB 50MG^CN103
 ;;ACETAMINOPHEN TAB 500MG^AN300
 ;;IBUPROFEN TAB 400MG^MS102
 ;;END
 ;
LBDATA ; Lab test data: NAME^TYPE
 ;;COMPLETE BLOOD COUNT^H
 ;;BASIC METABOLIC PANEL^CH
 ;;COMPREHENSIVE METABOLIC PANEL^CH
 ;;LIPID PANEL^CH
 ;;HEMOGLOBIN A1C^CH
 ;;THYROID STIMULATING HORMONE^CH
 ;;URINALYSIS^UA
 ;;PROTHROMBIN TIME^CO
 ;;BLOOD CULTURE^MI
 ;;URINE CULTURE^MI
 ;;HEPATITIS PANEL^SER
 ;;HIV ANTIBODY^SER
 ;;CARDIAC TROPONIN^CH
 ;;D-DIMER^CO
 ;;ERYTHROCYTE SEDIMENTATION RATE^H
 ;;END
 ;
RDDATA ; Radiology procedure data: NAME^TYPE
 ;;CHEST XRAY PA AND LATERAL^G
 ;;ABDOMINAL XRAY^G
 ;;CT HEAD WITHOUT CONTRAST^CT
 ;;CT CHEST WITH CONTRAST^CT
 ;;CT ABDOMEN WITH CONTRAST^CT
 ;;MRI BRAIN WITHOUT CONTRAST^MRI
 ;;MRI LUMBAR SPINE^MRI
 ;;ULTRASOUND ABDOMEN^US
 ;;ULTRASOUND PELVIS^US
 ;;MAMMOGRAM BILATERAL^MAM
 ;;BONE DENSITY SCAN^NM
 ;;NUCLEAR CARDIAC STRESS TEST^NM
 ;;FLUOROSCOPY UPPER GI^FL
 ;;END
 ;
INDATA ; Insurance company data: NAME
 ;;MEDICARE PART A
 ;;MEDICARE PART B
 ;;MEDICAID
 ;;TRICARE
 ;;BLUE CROSS BLUE SHIELD
 ;;AETNA
 ;;UNITED HEALTHCARE
 ;;CIGNA
 ;;HUMANA
 ;;KAISER PERMANENTE
 ;;END
 ;
