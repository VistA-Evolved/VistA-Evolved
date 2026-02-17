"""
Generate synthetic DICOM test data for Phase 22 imaging verification.
Creates two small studies (CT + X-ray) for patient DFN=100022
and uploads them to Orthanc via REST API.

Usage: python scripts/generate-demo-dicom.py [--orthanc-url http://localhost:8042]
"""

import argparse
import io
import os
import sys
import urllib.request
import urllib.error

try:
    import pydicom
    from pydicom.dataset import Dataset, FileDataset
    from pydicom.uid import generate_uid, ExplicitVRLittleEndian
    from pydicom.sequence import Sequence
except ImportError:
    print("ERROR: pydicom not installed. Run: pip install pydicom")
    sys.exit(1)


PATIENT_ID = "100022"
PATIENT_NAME = "DEMO^IMAGING^PATIENT"
PATIENT_DOB = "19650415"
PATIENT_SEX = "M"


def make_instance(study_uid, series_uid, sop_uid, modality, series_desc, series_num, instance_num, study_date, study_desc, accession):
    """Create a minimal valid DICOM instance."""
    ds = Dataset()
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    # Patient module
    ds.PatientName = PATIENT_NAME
    ds.PatientID = PATIENT_ID
    ds.PatientBirthDate = PATIENT_DOB
    ds.PatientSex = PATIENT_SEX

    # Study module
    ds.StudyInstanceUID = study_uid
    ds.StudyDate = study_date
    ds.StudyTime = "120000"
    ds.StudyDescription = study_desc
    ds.AccessionNumber = accession
    ds.StudyID = "1"
    ds.ReferringPhysicianName = "PROVIDER^CLYDE^WV"

    # Series module
    ds.SeriesInstanceUID = series_uid
    ds.Modality = modality
    ds.SeriesDescription = series_desc
    ds.SeriesNumber = series_num

    # Instance module
    ds.SOPInstanceUID = sop_uid
    ds.SOPClassUID = "1.2.840.10008.5.1.4.1.1.2"  # CT Image Storage
    ds.InstanceNumber = instance_num
    ds.ImageType = ["DERIVED", "PRIMARY"]
    ds.BitsAllocated = 8
    ds.BitsStored = 8
    ds.HighBit = 7
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.Rows = 4
    ds.Columns = 4
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.PixelData = bytes([0] * 16)  # 4x4 black image

    # File meta
    file_meta = pydicom.Dataset()
    file_meta.MediaStorageSOPClassUID = ds.SOPClassUID
    file_meta.MediaStorageSOPInstanceUID = ds.SOPInstanceUID
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    # Write to buffer
    buf = io.BytesIO()
    file_ds = FileDataset(buf, ds, file_meta=file_meta, preamble=b"\x00" * 128)
    file_ds.save_as(buf)
    buf.seek(0)
    return buf.read()


def upload_to_orthanc(dicom_bytes, orthanc_url):
    """Upload a DICOM instance to Orthanc via REST API."""
    url = f"{orthanc_url}/instances"
    req = urllib.request.Request(url, data=dicom_bytes, method="POST")
    req.add_header("Content-Type", "application/dicom")
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def main():
    parser = argparse.ArgumentParser(description="Generate and upload demo DICOM to Orthanc")
    parser.add_argument("--orthanc-url", default="http://localhost:8042", help="Orthanc base URL")
    args = parser.parse_args()

    print(f"Generating demo DICOM for PatientID={PATIENT_ID}")
    print(f"Target: {args.orthanc_url}")

    # Study 1: CT Chest (2 series, 2 instances each)
    study1_uid = generate_uid()
    series1a_uid = generate_uid()
    series1b_uid = generate_uid()

    instances = [
        (study1_uid, series1a_uid, generate_uid(), "CT", "AXIAL", 1, 1, "20250115", "CT CHEST W/O CONTRAST", "ACC001"),
        (study1_uid, series1a_uid, generate_uid(), "CT", "AXIAL", 1, 2, "20250115", "CT CHEST W/O CONTRAST", "ACC001"),
        (study1_uid, series1b_uid, generate_uid(), "CT", "CORONAL REFORMAT", 2, 1, "20250115", "CT CHEST W/O CONTRAST", "ACC001"),
        (study1_uid, series1b_uid, generate_uid(), "CT", "CORONAL REFORMAT", 2, 2, "20250115", "CT CHEST W/O CONTRAST", "ACC001"),
    ]

    # Study 2: X-ray (1 series, 1 instance)
    study2_uid = generate_uid()
    series2_uid = generate_uid()
    instances.append(
        (study2_uid, series2_uid, generate_uid(), "CR", "PA CHEST", 1, 1, "20250201", "XR CHEST 2 VIEWS", "ACC002")
    )

    uploaded = 0
    for inst_args in instances:
        dicom_bytes = make_instance(*inst_args)
        status, body = upload_to_orthanc(dicom_bytes, args.orthanc_url)
        if status == 200:
            uploaded += 1
            print(f"  Uploaded instance {inst_args[2][:20]}... ({inst_args[3]} {inst_args[4]})")
        else:
            print(f"  FAILED ({status}): {body[:100]}")

    print(f"\nUploaded {uploaded}/{len(instances)} instances")
    print(f"Study 1 UID: {study1_uid}")
    print(f"Study 2 UID: {study2_uid}")

    # Verify
    try:
        resp = urllib.request.urlopen(f"{args.orthanc_url}/studies", timeout=5)
        studies = eval(resp.read().decode())
        print(f"Orthanc now has {len(studies)} study/studies")
    except Exception as e:
        print(f"Warning: Could not verify: {e}")

    print("\nDone. Use these UIDs for verification queries.")


if __name__ == "__main__":
    main()
