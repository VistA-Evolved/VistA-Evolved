PROBE2 ; Detailed probe of HL7 logical links and HLO apps
 ;
 W "=== Logical Links Detail (first 10) ===",!
 N I,IEN,D0,D400
 S IEN=0
 F I=1:1:10 S IEN=$O(^HLCS(870,IEN)) Q:IEN=""  D
 . S D0=$G(^HLCS(870,IEN,0))
 . S D400=$G(^HLCS(870,IEN,400))
 . W I,": IEN=",IEN
 . W " NM=",$$PIECE(D0,"^",1)
 . W " INST=",$$PIECE(D0,"^",2)
 . W " MTYPE=",$$PIECE(D0,"^",3)
 . W " STATE=",$$PIECE(D0,"^",5)
 . W " APTS=",$$PIECE(D400,"^",1)
 . W " PORT=",$$PIECE(D400,"^",2)
 . W !
 ;
 W !,"=== HLO App Registry (779.2) ===",!
 N J,AIEN,AD0
 S AIEN=0
 F J=1:1:20 S AIEN=$O(^HLD(779.2,AIEN)) Q:AIEN=""  D
 . S AD0=$G(^HLD(779.2,AIEN,0))
 . W J,": IEN=",AIEN," DATA=",AD0,!
 ;
 W !,"=== HLO System Params (779.1) ===",!
 N K,SIEN,SD0
 S SIEN=0
 F K=1:1:5 S SIEN=$O(^HLD(779.1,SIEN)) Q:SIEN=""  D
 . S SD0=$G(^HLD(779.1,SIEN,0))
 . W K,": IEN=",SIEN," DATA=",SD0,!
 ;
 W !,"=== Sample HL7 Messages (773, first 5) ===",!
 N L,MIEN,MD0
 S MIEN=0
 F L=1:1:5 S MIEN=$O(^HLMA(MIEN)) Q:MIEN=""  D
 . S MD0=$G(^HLMA(MIEN,0))
 . W L,": IEN=",MIEN," DATA=",MD0,!
 ;
 W "=== DONE ===",!
 Q
 ;
PIECE(STR,DLM,PC) ; 
 Q $P(STR,DLM,PC)
