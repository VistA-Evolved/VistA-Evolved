ZVECHK8 ;VistA-Evolved -- Simulate VALIDAV^XUSRB and fix division ;2026
 ;
CHECK ;
 N U S U="^"
 ; Check if VALIDAV tag exists in XUSRB
 W "VALIDAV^XUSRB exists: "
 I $T(VALIDAV^XUSRB)'="" W "YES",!
 E  W "NO",!
 ; Check what institution 500 looks like
 W !,"=== Institution IEN 500 ===",!
 W "NODE 0: ",$G(^DIC(4,500,0)),!
 W "NODE 99: ",$G(^DIC(4,500,99)),!
 ; Now fix: Add division for DUZ=1 pointing to IEN 500
 W !,"=== Fixing DUZ=1 division ===",!
 ; Division subfile: ^VA(200,DUZ,"DIVISION",0) = ^200.02^count^count
 ; ^VA(200,DUZ,"DIVISION",1,0) = institution_ien^default_flag
 ; Set the header
 S ^VA(200,1,"DIVISION",0)="^200.02DA^1^1"
 ; Add division entry pointing to IEN 500
 S ^VA(200,1,"DIVISION",1,0)="500^1"
 W "Set DIVISION(0)=",$G(^VA(200,1,"DIVISION",0)),!
 W "Set DIVISION(1,0)=",$G(^VA(200,1,"DIVISION",1,0)),!
 ; Verify
 W "Division count: ",$P($G(^VA(200,1,"DIVISION",0)),U,3),!
 W "Division IEN: ",$P($G(^VA(200,1,"DIVISION",1,0)),U,1),!
 W "Default: ",$P($G(^VA(200,1,"DIVISION",1,0)),U,2),!
 ; Also fix institution 400 (the KSP default) to point to station 500
 W !,"=== Fix default institution IEN 400 ===",!
 N N0 S N0=$G(^DIC(4,400,0))
 I N0="" D
 . S ^DIC(4,400,0)="VEHU MEDICAL CENTER"
 . S ^DIC(4,400,99)="500^^^"
 . S ^DIC(4,"D",500,400)=""
 . W "Created institution 400 (VEHU MEDICAL CENTER, station 500)",!
 E  D
 . W "Institution 400 already has data: ",N0,!
 W !,"DONE - Try logging in again",!
 Q
