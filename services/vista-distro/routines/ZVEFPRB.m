ZVEFPRB ; VistA-Evolved - File #44 field probe
 ;
PROBE ;
 ; List all fields in File #44 HOSPITAL LOCATION
 N IEN,FLD,NAME,U
 S U="^"
 W "File #44 (HOSPITAL LOCATION) fields:",!
 W "=========================================",!
 S FLD=0
 F  S FLD=$O(^DD(44,FLD)) Q:'FLD  D
 . S NAME=$P($G(^DD(44,FLD,0)),U,1)
 . I NAME="" Q
 . W "  Field "_FLD_": "_NAME,!
 W !,"Done. Total scanned.",!
 Q
