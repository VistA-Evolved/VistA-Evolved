# Phase 380 — W21-P3 VERIFY

## Gates
1. Types exist: device-registry.types.ts exports ManagedDevice, DevicePatientAssociation, DeviceLocationMapping
2. Store CRUD: registerDevice, getDevice, getDeviceBySerial, listDevices, updateDevice, decommissionDevice
3. Association: associatePatient, disassociatePatient, getActiveAssociation, listAssociations
4. Location: mapDeviceLocation, getDeviceLocation, listLocationMappings
5. Audit: getDeviceAudit returns entries for all device lifecycle events
6. Routes: 18 endpoints under /devices/ prefix
7. Auth: /devices/ mapped to admin in AUTH_RULES
8. Store policy: 4 entries in devices domain (registry, associations, locations, audit)
9. Serial uniqueness: duplicate serial returns 409
10. No PHI: No raw patient names or SSN in device files
