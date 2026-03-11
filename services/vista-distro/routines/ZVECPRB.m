ZVECPRB ; VistA-Evolved - Check clinic create RPC registration
 ;
PROBE ;
 N U,$ETRAP
 S U="^",DUZ=1,DUZ(0)="@",DUZ(2)=500
 S $ETRAP="S $EC="""" W ""TRAPPED: "",$ZS,! G CONT^ZVECPRB"
 ;
 ; Force recompile of ZVECLIN
 W "Force ZLINKing ZVECLIN...",!
 ZLINK "ZVECLIN"
 W "ZLINK done",!
 ;
 ; Now test CLINCRT directly
 W !,"Testing CLINCRT^ZVECLIN...",!
 N RES
 D CLINCRT^ZVECLIN(.RES,"ZZ PROBE TEST","ZZPBT","M","",30)
 W "Results:",!
 N I S I="" F  S I=$O(RES(I)) Q:I=""  W "  RES("_I_")="_RES(I),!
 Q
 ;
CONT ;
 W "Continuing after error...",!
 Q
 N IEN,TAG,RTN,RTYPE
 S IEN=$$FIND1^DIC(8994,,"B","VE CLIN CREATE")
 I 'IEN W "VE CLIN CREATE: NOT REGISTERED",! G PROBL
 S TAG=$P(^XWB(8994,IEN,0),U,2)
 S RTN=$P(^XWB(8994,IEN,0),U,3)
 S RTYPE=$P(^XWB(8994,IEN,0),U,4)
 W "VE CLIN CREATE: IEN="_IEN_" TAG="_TAG_" RTN="_RTN_" TYPE="_RTYPE,!
 ;
PROBL ;
 S IEN=$$FIND1^DIC(8994,,"B","VE CLIN LIST")
 I 'IEN W "VE CLIN LIST: NOT REGISTERED",! G PROBW
 S TAG=$P(^XWB(8994,IEN,0),U,2)
 S RTN=$P(^XWB(8994,IEN,0),U,3)
 W "VE CLIN LIST: IEN="_IEN_" TAG="_TAG_" RTN="_RTN,!
 ;
PROBW ;
 ; Check if ZVECLIN routine exists
 I $T(CLINLST^ZVECLIN)'="" W "ZVECLIN CLINLST tag EXISTS",!
 E  W "ZVECLIN CLINLST tag MISSING",!
 I $T(CLINCRT^ZVECLIN)'="" W "ZVECLIN CLINCRT tag EXISTS",!
 E  W "ZVECLIN CLINCRT tag MISSING",!
 ;
 ; Try UPDATE^DIE directly to understand the error
 N FDA,IENS,ERR,NEWIEN
 S IENS="+1,"
 S FDA(44,IENS,.01)="ZZTESTCLINIC"
 S FDA(44,IENS,.02)="ZZTES"
 S FDA(44,IENS,.03)="C"
 S FDA(44,IENS,.09)=30
 S NEWIEN(1)=""
 W !,"FDA DUMP:",!
 N S S S="" F  S S=$O(FDA(44,S)) Q:S=""  W "  FDA(44,"""_S_"""," N F S F="" F  S F=$O(FDA(44,S,F)) Q:F=""  W F_")="_FDA(44,S,F)_" " W !
 W !,"Calling UPDATE^DIE...",!
 D UPDATE^DIE("E","FDA","NEWIEN","ERR")
 W "After UPDATE^DIE:",!
 I $D(ERR) D
 . W "ERR exists:",!
 . N E S E="" F  S E=$O(ERR(E)) Q:E=""  D
 . . W "  ERR("""_E_"""):",!
 . . I $D(ERR(E))#10 W "    ="_ERR(E),!
 . . N E2 S E2="" F  S E2=$O(ERR(E,E2)) Q:E2=""  D
 . . . I $D(ERR(E,E2))#10 W "    ("_E2_")="_ERR(E,E2),!
 . . . N E3 S E3="" F  S E3=$O(ERR(E,E2,E3)) Q:E3=""  D
 . . . . I $D(ERR(E,E2,E3))#10 W "    ("_E2_","_E3_")="_ERR(E,E2,E3),!
 . . . . N E4 S E4="" F  S E4=$O(ERR(E,E2,E3,E4)) Q:E4=""  D
 . . . . . I $D(ERR(E,E2,E3,E4))#10 W "    ("_E2_","_E3_","_E4_")="_ERR(E,E2,E3,E4),!
 E  W "No errors! NEWIEN(1)="_$G(NEWIEN(1)),!
 ;
 ; Also try with FILE^DIE instead
 W !,"=== Now trying FILE^DIE ===",!
 K FDA,ERR
 N DIC,DA,X,Y,DLAYGO
 ; Use DIC to add entry directly
 S DIC="^SC(",DIC(0)="L",X="ZZTESTCLINIC2",DLAYGO=44
 W "Trying DIC lookup/add for ZZTESTCLINIC2...",!
 D ^DIC
 W "Y="_$G(Y),!
 I +Y>0 W "Created/found IEN: "_+Y,!
 E  W "DIC failed: Y="_$G(Y),!
 Q
