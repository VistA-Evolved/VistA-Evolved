ZVERAD ;VE;Radiology Admin RPCs;2026-03-09
 ;
 ; Radiology domain RPCs for admin dashboard.
 ; File #71 (RAD/NUC MED PROCEDURES), File #79.1 (RAD/NUC MED CLASSIFICATION),
 ; File #79 (RAD/NUC MED DIVISION), File #44 (HOSPITAL LOCATION)
 ;
PROCLIST(RESULT,SEARCH,COUNT) ;List radiology procedures from File #71
 N IEN,NM,I,U,MAXCT,TYPE,CPT
 S U="^",I=0,MAXCT=+$G(COUNT)
 I MAXCT<1 S MAXCT=200
 I MAXCT>1000 S MAXCT=1000
 S SEARCH=$G(SEARCH)
 I '$D(^RAMIS(71)) S RESULT(0)=0 Q
 I SEARCH'="" D  Q
 . S NM=SEARCH
 . F  S NM=$O(^RAMIS(71,"B",NM)) Q:NM=""  Q:$E(NM,1,$L(SEARCH))'=SEARCH  Q:I>=MAXCT  D
 . . S IEN=$O(^RAMIS(71,"B",NM,""))
 . . Q:'IEN
 . . S TYPE=$P($G(^RAMIS(71,IEN,0)),U,6)
 . . S CPT=$P($G(^RAMIS(71,IEN,0)),U,9)
 . . S I=I+1
 . . S RESULT(I)=IEN_U_NM_U_TYPE_U_CPT
 . S RESULT(0)=I
 S IEN=0
 F  S IEN=$O(^RAMIS(71,IEN)) Q:'IEN  Q:I>=MAXCT  D
 . S NM=$P($G(^RAMIS(71,IEN,0)),U,1)
 . Q:NM=""
 . S TYPE=$P($G(^RAMIS(71,IEN,0)),U,6)
 . S CPT=$P($G(^RAMIS(71,IEN,0)),U,9)
 . S I=I+1
 . S RESULT(I)=IEN_U_NM_U_TYPE_U_CPT
 S RESULT(0)=I
 Q
 ;
PROCDET(RESULT,PROCIEN) ;Detail for one radiology procedure from File #71
 N U,Z0
 S U="^",PROCIEN=+$G(PROCIEN)
 I 'PROCIEN S RESULT(0)="-1^Procedure IEN required" Q
 I '$D(^RAMIS(71,PROCIEN,0)) S RESULT(0)="-1^Procedure not found" Q
 S Z0=$G(^RAMIS(71,PROCIEN,0))
 S RESULT(0)="1^OK"
 S RESULT(1)="IEN^"_PROCIEN
 S RESULT(2)="NAME^"_$P(Z0,U,1)
 S RESULT(3)="TYPE^"_$P(Z0,U,6)
 S RESULT(4)="CPT_CODE^"_$P(Z0,U,9)
 S RESULT(5)="CONTRAST_MEDIA^"_$P(Z0,U,5)
 S RESULT(6)="IMAGING_TYPE^"_$P(Z0,U,2)
 S RESULT(7)="DESCRIPTION^"_$P($G(^RAMIS(71,PROCIEN,1)),U,1)
 Q
 ;
IMGLOCL(RESULT) ;List imaging locations
 ; Combines File #79.1 classifications and File #44 type=I locations
 N IEN,NM,I,U,TYPE
 S U="^",I=0
 ; File #79.1 - RAD/NUC MED CLASSIFICATION
 I $D(^RA(79.1)) D
 . S IEN=0
 . F  S IEN=$O(^RA(79.1,IEN)) Q:'IEN  D
 . . S NM=$P($G(^RA(79.1,IEN,0)),U,1)
 . . Q:NM=""
 . . S I=I+1
 . . S RESULT(I)=IEN_U_NM_U_"CLASSIFICATION"
 ; File #44 type=I (imaging locations)
 S IEN=0
 F  S IEN=$O(^SC(IEN)) Q:'IEN  D
 . S TYPE=$P($G(^SC(IEN,0)),U,3)
 . Q:TYPE'="I"
 . S NM=$P($G(^SC(IEN,0)),U,1)
 . Q:NM=""
 . S I=I+1
 . S RESULT(I)=IEN_U_NM_U_"LOCATION"
 S RESULT(0)=I
 Q
 ;
DIVPARM(RESULT) ;List radiology division parameters from File #79
 N IEN,NM,I,U
 S U="^",I=0,IEN=0
 I '$D(^RA(79)) S RESULT(0)=0 Q
 F  S IEN=$O(^RA(79,IEN)) Q:'IEN  D
 . S NM=$P($G(^RA(79,IEN,0)),U,1)
 . Q:NM=""
 . S I=I+1
 . S RESULT(I)=IEN_U_NM_U_$P($G(^RA(79,IEN,0)),U,2)_U_$P($G(^RA(79,IEN,0)),U,3)
 S RESULT(0)=I
 Q
 ;
INSTALL ;Register RPCs in File #8994
 D REG^ZVEUSER("VE RAD PROC LIST","PROCLIST","ZVERAD")
 D REG^ZVEUSER("VE RAD PROC DETAIL","PROCDET","ZVERAD")
 D REG^ZVEUSER("VE RAD IMG LOCATIONS","IMGLOCL","ZVERAD")
 D REG^ZVEUSER("VE RAD DIV PARAMS","DIVPARM","ZVERAD")
 W "ZVERAD RPCs registered",!
 Q
