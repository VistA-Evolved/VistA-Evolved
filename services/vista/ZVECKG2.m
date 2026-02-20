ZVECKG2 ;VE/KM - Check ^XWB(8994 for File 8994
 ;
 N IEN,NAME,C S C=0,IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN'>0  D
 . S NAME=$P($G(^XWB(8994,IEN,0)),"^",1)
 . S C=C+1
 . I C<6 W C,": IEN=",IEN," NAME=",NAME,!
 W "Total ^XWB(8994 entries: ",C,!
 Q
