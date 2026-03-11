ZVEPRB3 ; File 36 + other file required field probe
 ;
PROBE ;
 N U,F,X
 S U="^"
 W "=== File #36 INSURANCE COMPANY ===",!
 W "Required/Identifier fields:",!
 S F=0
 F  S F=$O(^DD(36,F)) Q:F=""  D
 . S X=$G(^DD(36,F,0))
 . I $P(X,U,2)["R" W F," = ",$P(X,U,1)," [REQUIRED]",!
 W !,"DIC(36,0) = ",$G(^DIC(36,0)),!
 W "DIC(36,0,""GL"") = ",$G(^DIC(36,0,"GL")),!
 W !,"=== File #200 NEW PERSON ===",!
 W "Field 201 DD: ",$G(^DD(200,201,0)),!
 W "Field 7 DD: ",$G(^DD(200,7,0)),!
 W "Field 9.2 DD: ",$G(^DD(200,9.2,0)),!
 W !,"=== Test UPDATE^DIE for File #36 ===",!
 N FDA,ERR,NEWIEN
 S FDA(36,"+1,",.01)="TESTINSZZZ"
 D UPDATE^DIE("E","FDA","NEWIEN","ERR")
 I $D(ERR) D
 . W "ERROR: ",$G(ERR("DIERR",1,"TEXT",1)),!
 . W "Full: " I $D(ERR) ZW ERR
 E  D
 . W "Created IEN: ",$G(NEWIEN(1)),!
 . ; Clean up test entry
 . I $G(NEWIEN(1)) D
 . . N DA,DIK
 . . S DA=NEWIEN(1),DIK="^DIC(36,"
 . . D ^DIK
 . . W "Cleaned up",!
 Q
