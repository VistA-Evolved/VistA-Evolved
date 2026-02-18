 ; Dump ROcto user globals
ZVEDUMP ;
 W "=== Users ===",!
 N sub S sub=""
 F  S sub=$O(^%ydboctoocto("users",sub)) Q:sub=""  D
 . W "user: ",sub,!
 . W "  data: ",^%ydboctoocto("users",sub),!
 . I $D(^%ydboctoocto("users",sub,"permissions")) W "  perm: ",^%ydboctoocto("users",sub,"permissions"),!
 Q
