# VistA Distro Lane -- Custom Routines
#
# Place VistA-Evolved custom MUMPS routines here. They will be copied
# into the container at build time (/opt/vista/r/).
#
# The ZVE* namespace is reserved for VistA-Evolved routines.
# Copy routines from services/vista/ that should be available in the
# distro lane:
#
#   cp ../vista/ZVEMINS.m .
#   cp ../vista/ZVEMIOP.m .
#   cp ../vista/ZVESDSEED.m .
#   etc.
#
# Only copy routines that are needed for the distro lane. The dev sandbox
# routines in services/vista/ are not automatically included.
