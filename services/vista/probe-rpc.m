PROBE3 ; Check RPC registration capability
 ;
 ; Check for generic RPCs
 N IEN
 S IEN=$$FIND1^DIC(8994,,"B","XWB DIRECT RPC")
 W "XWB DIRECT RPC: ",IEN,!
 ;
 ; Check for OR CPRS GUI CHART context
 S IEN=$$FIND1^DIC(19,"","B","OR CPRS GUI CHART")
 W "OR CPRS GUI CHART context: ",IEN,!
 ;
 ; Check if we can create RPCs - look at file structure
 W "File 8994 header: ",$G(^XWB(8994,0)),!
 W "File 8994.1 header: ",$G(^DIC(19,0)),!
 ;
 ; Count total RPCs
 N CT S CT=0,IEN=0
 F  S IEN=$O(^XWB(8994,IEN)) Q:IEN=""  S CT=CT+1
 W "Total RPCs: ",CT,!
 ;
 ; Check for XWB RPC CONTEXT
 S IEN=$$FIND1^DIC(8994,,"B","XWB RPC CONTEXT")
 W "XWB RPC CONTEXT: ",IEN,!
 ;
 ; Check XUS GET USER INFO
 S IEN=$$FIND1^DIC(8994,,"B","XUS GET USER INFO")
 W "XUS GET USER INFO: ",IEN,!
 ;
 ; Try to find existing interop/HL7 RPCs
 N SRCH,SIEN
 S SRCH="HL"
 S SIEN=0
 W !,"RPCs starting with HL:",!
 F  S SIEN=$O(^XWB(8994,"B",SRCH)) Q:$E(SIEN,1,2)'="HL"  D
 . W "  ",SRCH,!
 . S SRCH=SIEN
 ;
 W !,"=== DONE ===",!
 Q
