ZVECHK3 ; Test FOLDERS directly from M context
 Q
EN ;
 N RES,I
 S DUZ=87
 S U="^"
 S DT=$$DT^XLFDT
 W "Calling FOLDERS^ZVEMSGR...",!
 D FOLDERS^ZVEMSGR(.RES)
 W "RES(0) = "_$G(RES(0)),!
 S I="" F  S I=$O(RES(I)) Q:I=""  W "RES("_I_") = "_RES(I),!
 W "DONE",!
 Q
