PROBE ; Probe HL7/HLO globals in WorldVistA
 ;
 W "=== HL7 Global Probe ===",!
 ;
 ; File #870 - HL LOGICAL LINK
 S X=$O(^HLCS(870,0)) W "HLCS870_first: ",X,!
 S X=$G(^HLCS(870,0)) W "HLCS870_header: ",X,!
 ;
 ; File #772 - HL7 MESSAGE TEXT
 S X=$O(^HL(772,0)) W "HL772_first: ",X,!
 S X=$G(^HL(772,0)) W "HL772_header: ",X,!
 ;
 ; File #773 - HL7 MESSAGE ADMINISTRATION
 S X=$O(^HLMA(0)) W "HLMA_first: ",X,!
 S X=$G(^HLMA(0)) W "HLMA_header: ",X,!
 ;
 ; File #776 - HL MONITOR JOB
 N Y S Y=$G(^HLCS(776,0)) W "HLCS776_header: ",Y,!
 ;
 ; File #776.1 - HL MONITOR EVENTS
 N Y S Y=$G(^HLCS(776.1,0)) W "HLCS776.1_header: ",Y,!
 ;
 ; HLO globals
 S X=$O(^HLB(0)) W "HLB_first: ",X,!
 S X=$G(^HLB(0)) W "HLB_header: ",X,!
 S X=$O(^HLA(0)) W "HLA_first: ",X,!
 S X=$G(^HLA(0)) W "HLA_header: ",X,!
 ;
 ; HLO Application Registry #779.1
 N Y S Y=$G(^HLD(779.1,0)) W "HLD779.1_header: ",Y,!
 ;
 ; HLO RPC List #779.2
 N Y S Y=$G(^HLD(779.2,0)) W "HLD779.2_header: ",Y,!
 ;
 ; HLO Subscription Registry #779.4
 N Y S Y=$G(^HLD(779.4,0)) W "HLD779.4_header: ",Y,!
 ;
 ; HLO Priority Queue #779.9
 N Y S Y=$G(^HLD(779.9,0)) W "HLD779.9_header: ",Y,!
 ;
 ; Enumerate first 5 logical links
 W "--- Logical Links (first 5) ---",!
 N I,IEN,NM S IEN=0
 F I=1:1:5 S IEN=$O(^HLCS(870,IEN)) Q:IEN=""  D
 . S NM=$P($G(^HLCS(870,IEN,0)),"^",1)
 . W I,": IEN=",IEN," NAME=",NM,!
 ;
 W "=== DONE ===",!
 Q
