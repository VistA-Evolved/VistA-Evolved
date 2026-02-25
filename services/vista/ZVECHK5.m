ZVECHK5 ; Test SEND from M context
 Q
EN ;
 N RES,PARAM
 S DUZ=87
 S U="^"
 S DT=$$DT^XLFDT
 ;
 ; Set up params like the service layer sends them
 S PARAM("SUBJ")="Phase 130 M Test Msg"
 S PARAM("TEXT",1)="Line 1 from M test"
 S PARAM("TEXT",2)="Line 2 from M test"
 S PARAM("REC",1)="87"
 ;
 W "Calling SEND^ZVEMSGR...",!
 D SEND^ZVEMSGR(.RES,.PARAM)
 W "RES(0) = "_$G(RES(0)),!
 N I S I="" F  S I=$O(RES(I)) Q:I=""  W "RES("_I_") = "_RES(I),!
 W "DONE",!
 Q
