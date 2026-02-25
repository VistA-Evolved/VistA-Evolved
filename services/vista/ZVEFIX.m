ZVEFIX ; Fix ZVE MAIL RPC return types (B -> 2)
 Q
EN ;
 N NAMES,I,NM,IEN,OLD,NEW,U
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
 . I IEN="" W "NOT FOUND: "_NM,! Q
 . S OLD=$G(^XWB(8994,IEN,0))
 . W NM_" IEN="_IEN_" BEFORE: "_OLD,!
 . ; Piece 4 is return type - change B to 2
 . S $P(OLD,U,4)=2
 . S ^XWB(8994,IEN,0)=OLD
 . S NEW=$G(^XWB(8994,IEN,0))
 . W "  AFTER:  "_NEW,!
 ;
 W !,"DONE: Return types fixed to 2 (ARRAY)",!
 Q
