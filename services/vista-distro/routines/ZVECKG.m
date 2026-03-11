ZVECKG ;VE/KM - Check global root for File 8994
 ;
 N ROOT
 S ROOT=$G(^DIC(8994,0,"GL"))
 W "GL node: ",ROOT,!
 ; Check a few globals
 W "^XTV(8994,0): ",$G(^XTV(8994,0)),!
 W "^DIC(8994,0): ",$G(^DIC(8994,0)),!
 ; Just count entries in ^DIC(8994
 N IEN,C S C=0,IEN=0
 F  S IEN=$O(^DIC(8994,IEN)) Q:IEN'>0  S C=C+1
 W "^DIC(8994 count: ",C,!
 ; Count entries in ^XTV(8994
 S C=0,IEN=0
 F  S IEN=$O(^XTV(8994,IEN)) Q:IEN'>0  S C=C+1
 W "^XTV(8994 count: ",C,!
 Q
