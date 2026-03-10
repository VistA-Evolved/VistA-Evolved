ZVEPRB4 ; Probe SET OF CODES for File 36 required fields
 ;
PROBE ;
 N U S U="^"
 W "Field 1 (REIMBURSE?) DD:",!
 W $G(^DD(36,1,0)),!
 W !,"Field 2 (SIG REQUIRED?) DD:",!
 W $G(^DD(36,2,0)),!
 W !,"Field 3.01 (TRANSMIT ELECTRONICALLY) DD:",!
 W $G(^DD(36,3.01,0)),!
 W !,"Field .111 (STREET) DD:",!
 W $G(^DD(36,.111,0)),!
 Q
