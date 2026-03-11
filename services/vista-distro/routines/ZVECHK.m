ZVECHK ; Check ZVE MAIL RPC registrations
 Q
 ;
EN ;
 N NM,IEN,NAMES,I,U,TYPES
 S U="^"
 S NAMES(1)="ZVE MAIL FOLDERS"
 S NAMES(2)="ZVE MAIL LIST"
 S NAMES(3)="ZVE MAIL GET"
 S NAMES(4)="ZVE MAIL SEND"
 S NAMES(5)="ZVE MAIL MANAGE"
 ;
 F I=1:1:5 D
 . S NM=NAMES(I)
 . S IEN=$O(^XWB(8994,"B",NM,""))
 . I IEN="" W NM_": NOT FOUND",! Q
 . W NM_" (IEN "_IEN_"):",!
 . W "  .01 NAME: "_$P($G(^XWB(8994,IEN,0)),U,1),!
 . W "  .02 TAG:  "_$G(^XWB(8994,IEN,.02)),!
 . W "  .03 RTN:  "_$G(^XWB(8994,IEN,.03)),!
 . W "  .04 RET:  "_$P($G(^XWB(8994,IEN,0)),U,2),!
 . W "  raw 0:    "_$G(^XWB(8994,IEN,0)),!
 . W !
 ;
 ; Also show what field .04 SET OF CODES looks like for file 8994
 W "--- Checking valid ret types from existing RPCs ---",!
 N R S R=""
 F  S R=$O(^XWB(8994,R)) Q:R=""  D
 . N RV S RV=$P($G(^XWB(8994,R,0)),U,2)
 . I RV'="" S TYPES(RV)=$G(TYPES(RV))+1
 S R=""
 F  S R=$O(TYPES(R)) Q:R=""  W "  Return type '"_R_"' used "_TYPES(R)_" times",!
 Q
