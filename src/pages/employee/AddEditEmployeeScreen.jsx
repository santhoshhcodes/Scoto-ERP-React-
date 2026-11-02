import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Briefcase,
  Calendar,
  Building,
  MapPin,
  AlertCircle,
  AlertTriangle,
  ScanFace,
  FileText,
  ShieldCheck,
  Tag,
  Lock,
  CreditCard,
  Landmark,
  FileSpreadsheet,
  Heart,
  Save,
  DollarSign,
  Info,
  Users,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import scotoLogo from '../../assets/Scoto.png';

const EMPLOYMENT_TYPES = [
  { id: 'FULL_TIME', label: 'Full Time' },
  { id: 'PART_TIME', label: 'Part Time' },
  { id: 'CONTRACT', label: 'Contract' },
  { id: 'INTERN', label: 'Intern' },
  { id: 'CASUAL', label: 'Casual / Daily' },
];

const EMPLOYMENT_STATUSES = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'INACTIVE', label: 'Inactive' },
  { id: 'RESIGNED', label: 'Resigned' },
  { id: 'TERMINATED', label: 'Terminated' },
];

const DEPARTMENTS = [
  'Mobile Application Developer',
  '.NET Developer',
  'PHP Developer',
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MARITAL_STATUSES = ['SINGLE', 'MARRIED'];
const ACCOUNT_TYPES = ['SAVINGS', 'CURRENT', 'SALARY'];
const PAY_FREQUENCIES = ['MONTHLY', 'WEEKLY', 'DAILY', 'BI_WEEKLY'];
const APP_ROLES = [
  { id: 'EMPLOYEE', label: 'Staff / Employee' },
  { id: 'HR_MANAGER', label: 'HR Manager' },
  { id: 'ACCOUNTS_OFFICER', label: 'Accounts Officer' },
  { id: 'ADMIN', label: 'Administrator' },
  { id: 'SystemAdmin', label: 'System Admin' },
];

export const AddEditEmployeeScreen = ({
  employeeToEdit = null,
  onBack,
  onSave,
  isLoading = false,
}) => {
  const isEdit = Boolean(employeeToEdit);
  const todayStr = new Date().toISOString().split('T')[0];

  // Role-based authorization for sensitive fields
  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('scoto_auth_user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const userRole = (authUser.role || authUser.role_code || 'SystemAdmin').toUpperCase();
  const canAccessSensitiveData = [
    'SUPER_ADMIN',
    'ADMIN',
    'SYSTEMADMIN',
    'HR_MANAGER',
    'ACCOUNTS_OFFICER',
    '1',
    '2',
  ].includes(userRole);

  const [activeSection, setActiveSection] = useState('personal');
  const [isOtherDepartment, setIsOtherDepartment] = useState(false);
  const [customDepartment, setCustomDepartment] = useState('');

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    setTimeout(() => {
      const el = document.getElementById(`section-${sectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const [formData, setFormData] = useState({
    // Protected identifiers (read-only in edit mode)
    EmployeeCode: '',
    EmployeeSource: 'MANUAL',
    ESSLEmployeeCode: '',
    IsActive: true,
    EmploymentStatus: 'ACTIVE',

    // Personal details
    FirstName: '',
    MiddleName: '',
    LastName: '',
    DisplayName: '',
    ProfilePhotoPath: '',
    DateOfBirth: '',
    Gender: 'MALE',
    BloodGroup: '',
    MaritalStatus: '',
    Nationality: 'Indian',

    // Contact details
    MobileNumber: '',
    AlternateMobileNumber: '',
    Email: '',

    // Address details
    AddressLine1: '',
    AddressLine2: '',
    City: '',
    District: '',
    State: 'Tamil Nadu',
    PostalCode: '',
    Country: 'India',

    // Family and Emergency
    FatherName: '',
    FatherMobileNumber: '',
    MotherName: '',
    MotherMobileNumber: '',
    EmergencyContactName: '',
    EmergencyContactNumber: '',
    EmergencyContactRelation: '',

    // Employment details
    DateOfJoining: todayStr,
    DateOfLeaving: '',
    EmploymentType: 'FULL_TIME',
    CompanyCode: '',
    CompanyName: 'Scoto Systec Pvt Ltd',
    LocationCode: '',
    LocationName: 'Main Plant',
    DepartmentId: '',
    DepartmentName: '',
    DesignationId: '',
    DesignationName: '',
    JobTitle: '',
    ReportingManagerCode: '',
    AppRole: 'EMPLOYEE',
    IsAppUser: false,

    // Bank details (Sensitive)
    BankName: '',
    BankBranch: '',
    AccountHolderName: '',
    AccountNumber: '',
    IFSCCode: '',
    AccountType: 'SAVINGS',

    // Statutory details (Sensitive)
    AadhaarNumber: '',
    PANNumber: '',
    PFApplicable: false,
    PFUAN: '',
    PFNumber: '',
    PFJoiningDate: '',
    ESIApplicable: false,
    ESINumber: '',

    // Salary details (Sensitive)
    SalaryGrade: '',
    PayFrequency: 'MONTHLY',
    SalaryEffectiveFrom: todayStr,
    BasicSalary: '',
    HRA: '',
    DA: '',
    OtherAllowances: '',
    GrossSalary: '',
    EmployeePFContribution: '',
    EmployerPFContribution: '',
    EmployeeESIContribution: '',
    EmployerESIContribution: '',
    ProfessionalTax: '',
    OtherDeductions: '',
    NetSalary: '',
    PreviousGrossSalary: '',
    LastSalaryRevisionDate: '',
    SalaryRemarks: '',

    // Notes
    Notes: '',
  });

  const [validationError, setValidationError] = useState('');

  // eSSL Device and Numeric Name detection for DB2 sync
  const isEsslRecord =
    formData.EmployeeSource === 'ESSL' ||
    Boolean(formData.ESSLEmployeeCode) ||
    Boolean(employeeToEdit?.EmployeeSource === 'ESSL') ||
    Boolean(employeeToEdit?.ESSLEmployeeCode);

  const isNumericFirstName = Boolean(
    formData.FirstName &&
      (!/[a-zA-Z]/.test(formData.FirstName.trim()) || /^\d+$/.test(formData.FirstName.trim()))
  );
  const isNumericDisplayName = Boolean(
    formData.DisplayName &&
      (!/[a-zA-Z]/.test(formData.DisplayName.trim()) || /^\d+$/.test(formData.DisplayName.trim()))
  );
  const hasNumericNameIssue = isNumericFirstName || isNumericDisplayName;

  const toInputDate = (val) => {
    if (!val) return '';
    try {
      return String(val).split('T')[0];
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (employeeToEdit) {
      const currentDept = employeeToEdit.DepartmentName || '';
      const isCustomDept = Boolean(
        currentDept && (!DEPARTMENTS.includes(currentDept) || currentDept === 'Other')
      );
      setIsOtherDepartment(isCustomDept);
      setCustomDepartment(isCustomDept && currentDept !== 'Other' ? currentDept : '');

      setFormData({
        EmployeeCode: employeeToEdit.EmployeeCode || '',
        EmployeeSource: employeeToEdit.EmployeeSource || 'MANUAL',
        ESSLEmployeeCode: employeeToEdit.ESSLEmployeeCode || '',
        IsActive: employeeToEdit.IsActive !== false,
        EmploymentStatus: employeeToEdit.EmploymentStatus || 'ACTIVE',

        FirstName: employeeToEdit.FirstName || '',
        MiddleName: employeeToEdit.MiddleName || '',
        LastName: employeeToEdit.LastName || '',
        DisplayName: employeeToEdit.DisplayName || '',
        ProfilePhotoPath: employeeToEdit.ProfilePhotoPath || '',
        DateOfBirth: toInputDate(employeeToEdit.DateOfBirth),
        Gender: employeeToEdit.Gender || 'MALE',
        BloodGroup: employeeToEdit.BloodGroup || '',
        MaritalStatus: employeeToEdit.MaritalStatus || '',
        Nationality: employeeToEdit.Nationality || 'Indian',

        MobileNumber: employeeToEdit.MobileNumber || '',
        AlternateMobileNumber: employeeToEdit.AlternateMobileNumber || '',
        Email: employeeToEdit.Email || '',

        AddressLine1: employeeToEdit.AddressLine1 || '',
        AddressLine2: employeeToEdit.AddressLine2 || '',
        City: employeeToEdit.City || '',
        District: employeeToEdit.District || '',
        State: employeeToEdit.State || 'Tamil Nadu',
        PostalCode: employeeToEdit.PostalCode || '',
        Country: employeeToEdit.Country || 'India',

        FatherName: employeeToEdit.FatherName || '',
        FatherMobileNumber: employeeToEdit.FatherMobileNumber || '',
        MotherName: employeeToEdit.MotherName || '',
        MotherMobileNumber: employeeToEdit.MotherMobileNumber || '',
        EmergencyContactName: employeeToEdit.EmergencyContactName || '',
        EmergencyContactNumber: employeeToEdit.EmergencyContactNumber || '',
        EmergencyContactRelation: employeeToEdit.EmergencyContactRelation || '',

        DateOfJoining: toInputDate(employeeToEdit.DateOfJoining) || todayStr,
        DateOfLeaving: toInputDate(employeeToEdit.DateOfLeaving),
        EmploymentType: employeeToEdit.EmploymentType || 'FULL_TIME',
        CompanyCode: employeeToEdit.CompanyCode || '',
        CompanyName: employeeToEdit.CompanyName || 'Scoto Dyeing',
        LocationCode: employeeToEdit.LocationCode || '',
        LocationName: employeeToEdit.LocationName || 'Main Plant',
        DepartmentId: employeeToEdit.DepartmentId || '',
        DepartmentName: currentDept,
        DesignationId: employeeToEdit.DesignationId || '',
        DesignationName: employeeToEdit.DesignationName || '',
        JobTitle: employeeToEdit.JobTitle || '',
        ReportingManagerCode: employeeToEdit.ReportingManagerCode || '',
        AppRole: employeeToEdit.AppRole || 'EMPLOYEE',
        IsAppUser: Boolean(employeeToEdit.IsAppUser),

        BankName: employeeToEdit.BankName || '',
        BankBranch: employeeToEdit.BankBranch || '',
        AccountHolderName: employeeToEdit.AccountHolderName || '',
        AccountNumber: employeeToEdit.AccountNumber || '',
        IFSCCode: employeeToEdit.IFSCCode || '',
        AccountType: employeeToEdit.AccountType || 'SAVINGS',

        AadhaarNumber: employeeToEdit.AadhaarNumber || '',
        PANNumber: employeeToEdit.PANNumber || '',
        PFApplicable: Boolean(employeeToEdit.PFApplicable),
        PFUAN: employeeToEdit.PFUAN || '',
        PFNumber: employeeToEdit.PFNumber || '',
        PFJoiningDate: toInputDate(employeeToEdit.PFJoiningDate),
        ESIApplicable: Boolean(employeeToEdit.ESIApplicable),
        ESINumber: employeeToEdit.ESINumber || '',

        SalaryGrade: employeeToEdit.SalaryGrade || '',
        PayFrequency: employeeToEdit.PayFrequency || 'MONTHLY',
        SalaryEffectiveFrom: toInputDate(employeeToEdit.SalaryEffectiveFrom) || todayStr,
        BasicSalary: employeeToEdit.BasicSalary !== null && employeeToEdit.BasicSalary !== undefined ? String(employeeToEdit.BasicSalary) : '',
        HRA: employeeToEdit.HRA !== null && employeeToEdit.HRA !== undefined ? String(employeeToEdit.HRA) : '',
        DA: employeeToEdit.DA !== null && employeeToEdit.DA !== undefined ? String(employeeToEdit.DA) : '',
        OtherAllowances: employeeToEdit.OtherAllowances !== null && employeeToEdit.OtherAllowances !== undefined ? String(employeeToEdit.OtherAllowances) : '',
        GrossSalary: employeeToEdit.GrossSalary !== null && employeeToEdit.GrossSalary !== undefined ? String(employeeToEdit.GrossSalary) : '',
        EmployeePFContribution: employeeToEdit.EmployeePFContribution !== null && employeeToEdit.EmployeePFContribution !== undefined ? String(employeeToEdit.EmployeePFContribution) : '',
        EmployerPFContribution: employeeToEdit.EmployerPFContribution !== null && employeeToEdit.EmployerPFContribution !== undefined ? String(employeeToEdit.EmployerPFContribution) : '',
        EmployeeESIContribution: employeeToEdit.EmployeeESIContribution !== null && employeeToEdit.EmployeeESIContribution !== undefined ? String(employeeToEdit.EmployeeESIContribution) : '',
        EmployerESIContribution: employeeToEdit.EmployerESIContribution !== null && employeeToEdit.EmployerESIContribution !== undefined ? String(employeeToEdit.EmployerESIContribution) : '',
        ProfessionalTax: employeeToEdit.ProfessionalTax !== null && employeeToEdit.ProfessionalTax !== undefined ? String(employeeToEdit.ProfessionalTax) : '',
        OtherDeductions: employeeToEdit.OtherDeductions !== null && employeeToEdit.OtherDeductions !== undefined ? String(employeeToEdit.OtherDeductions) : '',
        NetSalary: employeeToEdit.NetSalary !== null && employeeToEdit.NetSalary !== undefined ? String(employeeToEdit.NetSalary) : '',
        PreviousGrossSalary: employeeToEdit.PreviousGrossSalary !== null && employeeToEdit.PreviousGrossSalary !== undefined ? String(employeeToEdit.PreviousGrossSalary) : '',
        LastSalaryRevisionDate: toInputDate(employeeToEdit.LastSalaryRevisionDate),
        SalaryRemarks: employeeToEdit.SalaryRemarks || '',

        Notes: employeeToEdit.Notes || '',
      });
    } else {
      setIsOtherDepartment(false);
      setCustomDepartment('');
    }

    setValidationError('');
    const prevTitle = document.title;
    document.title = isEdit ? `SCOTO ERP - Edit Staff ${employeeToEdit?.EmployeeCode}` : 'SCOTO ERP - Add Employee';
    return () => {
      document.title = prevTitle || 'SCOTO ERP';
    };
  }, [employeeToEdit, isEdit]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Synchronize Account Active State and Employment Status
      if (field === 'IsActive') {
        if (value === true && ['INACTIVE', 'TERMINATED', 'RESIGNED'].includes(prev.EmploymentStatus)) {
          updated.EmploymentStatus = 'ACTIVE';
        } else if (value === false && prev.EmploymentStatus === 'ACTIVE') {
          updated.EmploymentStatus = 'INACTIVE';
        }
      }
      if (field === 'EmploymentStatus') {
        if (value === 'ACTIVE') {
          updated.IsActive = true;
        } else if (['INACTIVE', 'TERMINATED', 'RESIGNED'].includes(value)) {
          updated.IsActive = false;
        }
      }

      // Auto-compose display name if name parts change and DisplayName was not manually typed
      if (field === 'FirstName' || field === 'MiddleName' || field === 'LastName') {
        const parts = [
          field === 'FirstName' ? value : prev.FirstName,
          field === 'MiddleName' ? value : prev.MiddleName,
          field === 'LastName' ? value : prev.LastName,
        ].filter(Boolean);
        updated.DisplayName = parts.join(' ').trim();
      }

      // Auto-compute Gross Salary
      if (['BasicSalary', 'HRA', 'DA', 'OtherAllowances'].includes(field)) {
        const basic = parseFloat(field === 'BasicSalary' ? value : prev.BasicSalary) || 0;
        const hra = parseFloat(field === 'HRA' ? value : prev.HRA) || 0;
        const da = parseFloat(field === 'DA' ? value : prev.DA) || 0;
        const allow = parseFloat(field === 'OtherAllowances' ? value : prev.OtherAllowances) || 0;
        const gross = basic + hra + da + allow;
        if (gross > 0) {
          updated.GrossSalary = gross.toFixed(2);
        }
      }

      // Auto-compute Net Salary
      if (
        [
          'BasicSalary',
          'HRA',
          'DA',
          'OtherAllowances',
          'GrossSalary',
          'EmployeePFContribution',
          'EmployeeESIContribution',
          'ProfessionalTax',
          'OtherDeductions',
        ].includes(field)
      ) {
        const gross =
          parseFloat(field === 'GrossSalary' ? value : updated.GrossSalary || prev.GrossSalary) || 0;
        const pf = parseFloat(field === 'EmployeePFContribution' ? value : prev.EmployeePFContribution) || 0;
        const esi = parseFloat(field === 'EmployeeESIContribution' ? value : prev.EmployeeESIContribution) || 0;
        const pt = parseFloat(field === 'ProfessionalTax' ? value : prev.ProfessionalTax) || 0;
        const deductions = parseFloat(field === 'OtherDeductions' ? value : prev.OtherDeductions) || 0;
        const totalDed = pf + esi + pt + deductions;
        if (gross > 0) {
          updated.NetSalary = Math.max(0, gross - totalDed).toFixed(2);
        }
      }

      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    // 1. Employee Code (Mandatory for new employee)
    if (!isEdit && !formData.EmployeeCode.trim()) {
      setValidationError('Employee Code is required.');
      scrollToSection('personal');
      return;
    }

    // 2. Employee Name / First Name (Mandatory & cannot be purely numbers/device ID)
    const trimmedFirstName = formData.FirstName.trim();
    if (!trimmedFirstName) {
      setValidationError('Employee Name (First Name) is mandatory.');
      scrollToSection('personal');
      return;
    }

    if (!/[a-zA-Z]/.test(trimmedFirstName) || /^\d+$/.test(trimmedFirstName)) {
      setValidationError(
        'Employee Name cannot be just numbers. Please enter the employee’s actual legal name (not the biometric terminal ID) so it updates properly in the database (DB2).'
      );
      scrollToSection('personal');
      return;
    }

    // 3. Mobile Number (Mandatory & valid 10 digits)
    const trimmedMobile = formData.MobileNumber.trim();
    if (!trimmedMobile) {
      setValidationError('Mobile Number is mandatory.');
      scrollToSection('contact');
      return;
    }
    const cleanDigits = trimmedMobile.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setValidationError('Please enter a valid 10-digit Mobile Number.');
      scrollToSection('contact');
      return;
    }

    // 4. Email ID (Mandatory & valid email format)
    const trimmedEmail = formData.Email.trim();
    if (!trimmedEmail) {
      setValidationError('Official / Personal Email ID is mandatory.');
      scrollToSection('contact');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setValidationError('Please enter a valid Email ID (e.g. employee@scotogroup.com).');
      scrollToSection('contact');
      return;
    }

    // 5. Address Details (Mandatory: Address Line 1, City, State, PIN Code)
    if (!formData.AddressLine1.trim()) {
      setValidationError('Address Line 1 is mandatory.');
      scrollToSection('contact');
      return;
    }
    if (!formData.City.trim()) {
      setValidationError('City / Town is mandatory in Address Details.');
      scrollToSection('contact');
      return;
    }
    if (!formData.State.trim()) {
      setValidationError('State is mandatory in Address Details.');
      scrollToSection('contact');
      return;
    }
    if (!formData.PostalCode.trim()) {
      setValidationError('Postal / PIN Code is mandatory in Address Details.');
      scrollToSection('contact');
      return;
    }

    // 6. Date of Joining (Mandatory)
    if (!formData.DateOfJoining) {
      setValidationError('Date of Joining is mandatory.');
      scrollToSection('employment');
      return;
    }

    // 7. Date of Resigning / Leaving (Mandatory when status is Resigned or Terminated)
    if (['RESIGNED', 'TERMINATED'].includes(formData.EmploymentStatus)) {
      if (!formData.DateOfLeaving) {
        setValidationError(
          `Date of Resigning / Leaving is mandatory when Employment Status is marked as "${formData.EmploymentStatus === 'RESIGNED' ? 'Resigned' : 'Terminated'}".`
        );
        scrollToSection('employment');
        return;
      }
    }

    if (formData.DateOfLeaving && formData.DateOfJoining && formData.DateOfLeaving < formData.DateOfJoining) {
      setValidationError('Date of Resigning / Leaving cannot be earlier than Date of Joining.');
      scrollToSection('employment');
      return;
    }

    // Prepare payload
    const payload = {};

    // Only include EmployeeCode for new employee creation
    if (!isEdit) {
      payload.EmployeeCode = formData.EmployeeCode.trim();
      payload.EmployeeSource = formData.EmployeeSource || 'MANUAL';
      if (formData.EmployeeSource === 'ESSL') {
        payload.ESSLEmployeeCode = formData.ESSLEmployeeCode
          ? formData.ESSLEmployeeCode.trim()
          : formData.EmployeeCode.trim();
      } else {
        payload.ESSLEmployeeCode = formData.ESSLEmployeeCode ? formData.ESSLEmployeeCode.trim() : null;
      }
    } else {
      payload.EmployeeSource = formData.EmployeeSource || 'MANUAL';
      payload.ESSLEmployeeCode = formData.ESSLEmployeeCode ? formData.ESSLEmployeeCode.trim() : null;
    }

    // Personal details
    payload.FirstName = trimmedFirstName;
    payload.MiddleName = formData.MiddleName.trim() || null;
    payload.LastName = formData.LastName.trim() || null;
    payload.DisplayName = formData.DisplayName.trim() || trimmedFirstName;
    payload.DateOfBirth = formData.DateOfBirth || null;
    payload.Gender = formData.Gender || null;
    payload.BloodGroup = formData.BloodGroup || null;
    payload.MaritalStatus = formData.MaritalStatus || null;
    payload.Nationality = formData.Nationality.trim() || 'Indian';

    // Contact details
    payload.MobileNumber = trimmedMobile;
    payload.AlternateMobileNumber = formData.AlternateMobileNumber.trim() || null;
    payload.Email = trimmedEmail;

    // Address details
    payload.AddressLine1 = formData.AddressLine1.trim();
    payload.AddressLine2 = formData.AddressLine2.trim() || null;
    payload.City = formData.City.trim();
    payload.District = formData.District.trim() || null;
    payload.State = formData.State.trim();
    payload.PostalCode = formData.PostalCode.trim();
    payload.Country = formData.Country.trim() || 'India';

    // Family and Emergency
    payload.FatherName = formData.FatherName.trim() || null;
    payload.FatherMobileNumber = formData.FatherMobileNumber.trim() || null;
    payload.MotherName = formData.MotherName.trim() || null;
    payload.MotherMobileNumber = formData.MotherMobileNumber.trim() || null;
    payload.EmergencyContactName = formData.EmergencyContactName.trim() || null;
    payload.EmergencyContactNumber = formData.EmergencyContactNumber.trim() || null;
    payload.EmergencyContactRelation = formData.EmergencyContactRelation.trim() || null;

    // Employment details
    payload.DateOfJoining = formData.DateOfJoining;
    payload.DateOfLeaving = formData.DateOfLeaving || null;
    payload.EmploymentType = formData.EmploymentType;
    payload.EmploymentStatus = formData.EmploymentStatus;
    payload.CompanyName = formData.CompanyName.trim() || null;
    payload.LocationName = formData.LocationName.trim() || null;
    if (isOtherDepartment) {
      const trimmedCustom = customDepartment.trim();
      if (!trimmedCustom || trimmedCustom.toLowerCase() === 'other') {
        setValidationError('Please enter a specific department name.');
        setActiveSection('employment');
        return;
      }
      payload.DepartmentName = trimmedCustom;
    } else {
      payload.DepartmentName = formData.DepartmentName ? formData.DepartmentName.trim() : null;
    }
    payload.DesignationName = formData.DesignationName.trim() || null;
    payload.JobTitle = formData.JobTitle.trim() || formData.DesignationName.trim() || null;
    payload.ReportingManagerCode = formData.ReportingManagerCode.trim() || null;
    payload.AppRole = formData.AppRole || null;
    payload.IsAppUser = Boolean(formData.IsAppUser);
    payload.IsActive = Boolean(formData.IsActive);

    // Sensitive Bank details (if authorized)
    if (canAccessSensitiveData) {
      payload.BankName = formData.BankName.trim() || null;
      payload.BankBranch = formData.BankBranch.trim() || null;
      payload.AccountHolderName = formData.AccountHolderName.trim() || null;
      payload.AccountNumber = formData.AccountNumber.trim() || null;
      payload.IFSCCode = formData.IFSCCode.trim().toUpperCase() || null;
      payload.AccountType = formData.AccountType || null;

      // Statutory details
      payload.AadhaarNumber = formData.AadhaarNumber.trim() || null;
      payload.PANNumber = formData.PANNumber.trim().toUpperCase() || null;
      payload.PFApplicable = Boolean(formData.PFApplicable);
      payload.PFUAN = formData.PFUAN.trim() || null;
      payload.PFNumber = formData.PFNumber.trim() || null;
      payload.PFJoiningDate = formData.PFJoiningDate || null;
      payload.ESIApplicable = Boolean(formData.ESIApplicable);
      payload.ESINumber = formData.ESINumber.trim() || null;

      // Salary details
      payload.SalaryGrade = formData.SalaryGrade.trim() || null;
      payload.PayFrequency = formData.PayFrequency || 'MONTHLY';
      payload.SalaryEffectiveFrom = formData.SalaryEffectiveFrom || null;
      payload.BasicSalary = formData.BasicSalary ? parseFloat(formData.BasicSalary) : null;
      payload.HRA = formData.HRA ? parseFloat(formData.HRA) : null;
      payload.DA = formData.DA ? parseFloat(formData.DA) : null;
      payload.OtherAllowances = formData.OtherAllowances ? parseFloat(formData.OtherAllowances) : null;
      payload.GrossSalary = formData.GrossSalary ? parseFloat(formData.GrossSalary) : null;
      payload.EmployeePFContribution = formData.EmployeePFContribution
        ? parseFloat(formData.EmployeePFContribution)
        : null;
      payload.EmployerPFContribution = formData.EmployerPFContribution
        ? parseFloat(formData.EmployerPFContribution)
        : null;
      payload.EmployeeESIContribution = formData.EmployeeESIContribution
        ? parseFloat(formData.EmployeeESIContribution)
        : null;
      payload.EmployerESIContribution = formData.EmployerESIContribution
        ? parseFloat(formData.EmployerESIContribution)
        : null;
      payload.ProfessionalTax = formData.ProfessionalTax ? parseFloat(formData.ProfessionalTax) : null;
      payload.OtherDeductions = formData.OtherDeductions ? parseFloat(formData.OtherDeductions) : null;
      payload.NetSalary = formData.NetSalary ? parseFloat(formData.NetSalary) : null;
      payload.LastSalaryRevisionDate = formData.LastSalaryRevisionDate || null;
      payload.SalaryRemarks = formData.SalaryRemarks.trim() || null;
    }

    // Notes
    payload.Notes = formData.Notes.trim() || null;

    onSave(payload);
  };



  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Directory</span>
          </button>

          {/* Scoto Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 border border-slate-200 shadow-xs">
              <img src={scotoLogo} alt="SCOTO ERP Logo" className="h-full w-full object-contain" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-xs tracking-tight text-slate-800 flex items-center gap-1">
                  SCOTO <span className="text-indigo-600 font-black">ERP</span>
                </span>
                <span className="text-slate-300">•</span>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  {isEdit ? `Edit Staff: ${employeeToEdit?.DisplayName || employeeToEdit?.EmployeeCode}` : 'New Employee Onboarding'}
                </h1>
                {isEdit ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
                    <Lock className="h-3 w-3" />
                    <span>Code: {employeeToEdit?.EmployeeCode}</span>
                  </span>
                ) : (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    Direct Registration
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {isEdit
                  ? `Update personal, departmental, statutory, and salary profile details for ${employeeToEdit?.EmployeeCode}`
                  : 'Register staff member into Employee_Mst with complete personnel profile'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons in Header */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {isLoading ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>{isEdit ? 'Save Profile Updates' : 'Create Staff Member'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 shadow-2xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span className="font-semibold">{validationError}</span>
        </div>
      )}

      {/* Quick Jump Navigation Bar */}
      {/* <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-200 scrollbar-thin">
        {navSections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                setActiveSection(sec.id);
                const el = document.getElementById(`section-${sec.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{sec.label}</span>
              {sec.sensitive && (
                <span
                  className={`text-[9px] px-1 rounded ${
                    isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  Confidential
                </span>
              )}
            </button>
          );
        })}
      </div> */}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card: Protected Identifiers & System Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                System Identifiers & Status
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Core System Identifiers</span>
          </div>

          {isEdit && employeeToEdit?.IsActive === false && (
            <div
              className={`rounded-xl border p-3.5 text-xs flex flex-wrap items-center justify-between gap-3 transition-colors ${
                formData.IsActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    formData.IsActive
                      ? 'bg-emerald-200 text-emerald-800'
                      : 'bg-rose-200 text-rose-800'
                  }`}
                >
                  {formData.IsActive ? 'Reactivating' : 'Inactive Profile'}
                </span>
                <span className="font-medium">
                  {formData.IsActive
                    ? 'Account Active State is set to Active. Saving this profile will reactivate this employee in ERP & attendance lists.'
                    : 'This profile is currently inactive. Set Account Active State below to "Active Staff Member" to reactivate this employee.'}
                </span>
              </div>
              {!formData.IsActive ? (
                <button
                  type="button"
                  onClick={() => handleChange('IsActive', true)}
                  className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer transition-colors"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Reactivate Employee</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleChange('IsActive', false)}
                  className="shrink-0 text-xs text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer"
                >
                  Keep Inactive
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <span>Employee Code</span>
                {isEdit && <Lock className="h-3 w-3 text-slate-400" />}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isEdit}
                value={formData.EmployeeCode}
                onChange={(e) => handleChange('EmployeeCode', e.target.value)}
                placeholder="e.g. EMP-025 or 015"
                className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isEdit ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-slate-50/50'
                  }`}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {isEdit ? 'Immutable system identifier' : 'Unique identifier in attendance & ERP'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <span>Source Channel</span>
                {isEdit ? <Lock className="h-3 w-3 text-slate-400" /> : <Tag className="h-3 w-3 text-indigo-500" />}
              </label>
              {isEdit ? (
                <div className="flex items-center h-[34px] px-3 rounded-lg border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
                  {formData.EmployeeSource === 'ESSL' || Boolean(formData.ESSLEmployeeCode)
                    ? 'eSSL Biometric Terminal'
                    : 'Manual Direct Entry'}
                </div>
              ) : (
                <select
                  value={formData.EmployeeSource}
                  onChange={(e) => {
                    const src = e.target.value;
                    handleChange('EmployeeSource', src);
                    if (src === 'ESSL' && !formData.ESSLEmployeeCode) {
                      handleChange('ESSLEmployeeCode', formData.EmployeeCode || '');
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="MANUAL">Manual Direct Entry</option>
                  <option value="ESSL">eSSL Biometric Terminal</option>
                </select>
              )}
              <span className="text-[10px] text-slate-400 mt-1 block">System synchronization source</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <span>eSSL Biometric User ID</span>
                {isEdit && <Lock className="h-3 w-3 text-slate-400" />}
              </label>
              <input
                type="text"
                disabled={isEdit}
                value={formData.ESSLEmployeeCode}
                onChange={(e) => handleChange('ESSLEmployeeCode', e.target.value)}
                placeholder={formData.EmployeeSource === 'ESSL' ? 'e.g. 101 or biometric user pin' : 'Not Linked / Manual'}
                className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-600 ${
                  isEdit
                    ? 'bg-slate-100 cursor-not-allowed'
                    : 'bg-slate-50/50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500'
                }`}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Hardware terminal enrollment PIN</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Account Active State</span>
                {isEdit && !formData.IsActive && (
                  <span className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                    Inactive
                  </span>
                )}
                {isEdit && formData.IsActive && employeeToEdit?.IsActive === false && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Reactivating
                  </span>
                )}
              </label>
              <select
                value={formData.IsActive ? 'true' : 'false'}
                onChange={(e) => handleChange('IsActive', e.target.value === 'true')}
                className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  !formData.IsActive
                    ? 'border-rose-300 bg-rose-50/50 text-rose-900'
                    : 'border-slate-200 bg-slate-50/50 text-slate-900'
                }`}
              >
                <option value="true">Active Staff Member</option>
                <option value="false">Inactive / Suspended</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">Controls visibility in active lists</span>
            </div>
          </div>
        </div>

        {/* Section 1: Personal & Identity Details */}
        <div id="section-personal" className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                1. Personal Details & Identity
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Demographics</span>
          </div>

          {/* Highlight Banner for eSSL Biometric Synced or Numeric Name */}
          {(isEsslRecord || hasNumericNameIssue) && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-xs flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-amber-200/70 text-amber-800 shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold flex items-center gap-2 text-slate-900">
                    <span>eSSL Biometric Device Record — Employee Name Update</span>
                    <span className="inline-flex items-center gap-1 rounded bg-amber-200 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-900 border border-amber-300">
                      Syncs to DB2
                    </span>
                  </div>
                  {hasNumericNameIssue && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-300 animate-pulse">
                      Numeric Name Detected (Action Required)
                    </span>
                  )}
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Employees imported from the eSSL biometric terminal often register with their hardware user ID number as their name. 
                  <strong className="font-semibold text-slate-900"> You must replace the number with the employee's actual full legal name.</strong> Updating the name here ensures it correctly syncs and updates the primary database (DB2).
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={hasNumericNameIssue || isEsslRecord ? 'rounded-lg p-2.5 bg-amber-50/60 border border-amber-200' : ''}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  First Name / Employee Name <span className="text-rose-500">*</span>
                </label>
                {hasNumericNameIssue && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                    <AlertTriangle className="h-3 w-3 text-amber-700" />
                    Number detected
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={formData.FirstName}
                onChange={(e) => handleChange('FirstName', e.target.value)}
                placeholder="Given Name (e.g. Ramesh or Priya)"
                className={`w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                  hasNumericNameIssue
                    ? 'border-2 border-amber-500 bg-amber-50/40 text-amber-950 focus:border-amber-600 focus:ring-amber-400'
                    : 'border border-slate-200 bg-slate-50/50 focus:border-indigo-500 focus:bg-white focus:ring-indigo-500'
                }`}
              />
              {hasNumericNameIssue ? (
                <span className="text-[11px] font-semibold text-amber-800 mt-1 block flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                  Must be person's actual name, not a number (updates DB2)
                </span>
              ) : isEsslRecord ? (
                <span className="text-[10px] text-indigo-600 font-medium mt-1 block">
                  eSSL Synced: Name updates commit directly to DB2
                </span>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Name</label>
              <input
                type="text"
                value={formData.MiddleName}
                onChange={(e) => handleChange('MiddleName', e.target.value)}
                placeholder="Middle Name"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name / Surname</label>
              <input
                type="text"
                value={formData.LastName}
                onChange={(e) => handleChange('LastName', e.target.value)}
                placeholder="Surname"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Display / Full Name</label>
                {isNumericDisplayName && (
                  <span className="text-[10px] text-amber-700 font-bold">Numeric</span>
                )}
              </div>
              <input
                type="text"
                value={formData.DisplayName}
                onChange={(e) => handleChange('DisplayName', e.target.value)}
                placeholder="Full Display Name"
                className={`w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                  isNumericDisplayName
                    ? 'border-2 border-amber-400 bg-amber-50/40 text-amber-950 focus:border-amber-500 focus:ring-amber-400'
                    : 'border border-slate-200 bg-slate-50/50 focus:border-indigo-500 focus:bg-white focus:ring-indigo-500'
                }`}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Shown across reports, attendance sheets & dashboard
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.DateOfBirth}
                onChange={(e) => handleChange('DateOfBirth', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <select
                value={formData.Gender}
                onChange={(e) => handleChange('Gender', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
              <select
                value={formData.BloodGroup}
                onChange={(e) => handleChange('BloodGroup', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Marital Status</label>
              <select
                value={formData.MaritalStatus}
                onChange={(e) => handleChange('MaritalStatus', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select Status</option>
                {MARITAL_STATUSES.map((ms) => (
                  <option key={ms} value={ms}>
                    {ms}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Address Details */}
        <div id="section-contact" className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                2. Contact & Address Details
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Communication & Location</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.MobileNumber}
                onChange={(e) => handleChange('MobileNumber', e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Mandatory 10-digit primary mobile contact</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Mobile</label>
              <input
                type="tel"
                value={formData.AlternateMobileNumber}
                onChange={(e) => handleChange('AlternateMobileNumber', e.target.value)}
                placeholder="Alternative Contact"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official / Personal Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.Email}
                onChange={(e) => handleChange('Email', e.target.value)}
                placeholder="staff@scotogroup.com"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Mandatory email address for HR & notifications</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address Line 1 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.AddressLine1}
                onChange={(e) => handleChange('AddressLine1', e.target.value)}
                placeholder="Street Address, Door / Flat No."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Mandatory primary street / premise address</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 2</label>
              <input
                type="text"
                value={formData.AddressLine2}
                onChange={(e) => handleChange('AddressLine2', e.target.value)}
                placeholder="Apartment, Landmark, Area"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / Town <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.City}
                onChange={(e) => handleChange('City', e.target.value)}
                placeholder="City"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
              <input
                type="text"
                value={formData.District}
                onChange={(e) => handleChange('District', e.target.value)}
                placeholder="District"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.State}
                onChange={(e) => handleChange('State', e.target.value)}
                placeholder="State"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Postal / PIN Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.PostalCode}
                onChange={(e) => handleChange('PostalCode', e.target.value)}
                placeholder="PIN Code"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
              <input
                type="text"
                value={formData.Country}
                onChange={(e) => handleChange('Country', e.target.value)}
                placeholder="Country"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Family & Emergency Contact */}
        <div id="section-family" className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                3. Family & Emergency Contacts
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Kinship & Emergency</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Father's Name</label>
              <input
                type="text"
                value={formData.FatherName}
                onChange={(e) => handleChange('FatherName', e.target.value)}
                placeholder="Father's Full Name"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Father's Mobile</label>
              <input
                type="tel"
                value={formData.FatherMobileNumber}
                onChange={(e) => handleChange('FatherMobileNumber', e.target.value)}
                placeholder="Mobile Number"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mother's Name</label>
              <input
                type="text"
                value={formData.MotherName}
                onChange={(e) => handleChange('MotherName', e.target.value)}
                placeholder="Mother's Full Name"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mother's Mobile</label>
              <input
                type="tel"
                value={formData.MotherMobileNumber}
                onChange={(e) => handleChange('MotherMobileNumber', e.target.value)}
                placeholder="Mobile Number"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Person</label>
              <input
                type="text"
                value={formData.EmergencyContactName}
                onChange={(e) => handleChange('EmergencyContactName', e.target.value)}
                placeholder="Full Name"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone Number</label>
              <input
                type="tel"
                value={formData.EmergencyContactNumber}
                onChange={(e) => handleChange('EmergencyContactNumber', e.target.value)}
                placeholder="Phone Number"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship to Staff</label>
              <input
                type="text"
                value={formData.EmergencyContactRelation}
                onChange={(e) => handleChange('EmergencyContactRelation', e.target.value)}
                placeholder="e.g. Spouse, Father, Sibling"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Employment & Organization Placement */}
        <div id="section-employment" className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                4. Employment & Organizational Placement
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Department & Position</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Joining <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.DateOfJoining}
                onChange={(e) => handleChange('DateOfJoining', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Mandatory official onboarding date</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>
                  Date of Resigning / Leaving{' '}
                  {['RESIGNED', 'TERMINATED'].includes(formData.EmploymentStatus) && (
                    <span className="text-rose-500">*</span>
                  )}
                </span>
                {['RESIGNED', 'TERMINATED'].includes(formData.EmploymentStatus) && (
                  <span className="rounded bg-rose-50 px-1 py-0.2 text-[9px] font-bold text-rose-700 border border-rose-200">
                    Mandatory
                  </span>
                )}
              </label>
              <input
                type="date"
                value={formData.DateOfLeaving}
                onChange={(e) => handleChange('DateOfLeaving', e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                  ['RESIGNED', 'TERMINATED'].includes(formData.EmploymentStatus) && !formData.DateOfLeaving
                    ? 'border-2 border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500'
                    : 'border border-slate-200 bg-slate-50/50 focus:border-indigo-500 focus:bg-white focus:ring-indigo-500'
                }`}
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {['RESIGNED', 'TERMINATED'].includes(formData.EmploymentStatus)
                  ? 'Mandatory because status is marked as Resigned / Terminated'
                  : 'Optional (required if employment status is Resigned)'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
              <select
                value={formData.EmploymentType}
                onChange={(e) => handleChange('EmploymentType', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Status</label>
              <select
                value={formData.EmploymentStatus}
                onChange={(e) => handleChange('EmploymentStatus', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {EMPLOYMENT_STATUSES.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>


            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>

              <select
                value={isOtherDepartment ? 'Other' : (formData.DepartmentName || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'Other') {
                    setIsOtherDepartment(true);
                    handleChange('DepartmentName', customDepartment.trim() || 'Other');
                  } else {
                    setIsOtherDepartment(false);
                    setCustomDepartment('');
                    handleChange('DepartmentName', val);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select Department</option>

                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>

              {isOtherDepartment && (
                <div className="mt-2 animate-in fade-in duration-200">
                  <input
                    type="text"
                    value={customDepartment}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomDepartment(val);
                      handleChange('DepartmentName', val);
                    }}
                    placeholder="Enter custom department name (e.g. Quality Assurance, Flutter)"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Specify the employee's custom department name.
                  </p>
                </div>
              )}
            </div>


            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={formData.DesignationName}
                onChange={(e) => handleChange('DesignationName', e.target.value)}
                placeholder="e.g. Production Manager"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                value={formData.JobTitle}
                onChange={(e) => handleChange('JobTitle', e.target.value)}
                placeholder="e.g. Lead Dyeing Specialist"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Manager Code</label>
              <input
                type="text"
                value={formData.ReportingManagerCode}
                onChange={(e) => handleChange('ReportingManagerCode', e.target.value)}
                placeholder="Manager Employee Code"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Operating Entity</label>
              <input
                type="text"
                value={formData.CompanyName}
                onChange={(e) => handleChange('CompanyName', e.target.value)}
                placeholder="Scoto Dyeing"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plant / Location</label>
              <input
                type="text"
                value={formData.LocationName}
                onChange={(e) => handleChange('LocationName', e.target.value)}
                placeholder="Main Plant"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ERP Security Role</label>
              <select
                value={formData.AppRole}
                onChange={(e) => handleChange('AppRole', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {APP_ROLES.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.IsAppUser}
                  onChange={(e) => handleChange('IsAppUser', e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700">Grant ERP Login Portal Access</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 5: Bank Details (Sensitive) */}
        <div id="section-bank" className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                5. Bank & Remittance Information
              </h2>
            </div>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
              Confidential Payroll Field
            </span>
          </div>

          {!canAccessSensitiveData ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <Lock className="h-4 w-4 text-slate-400 shrink-0" />
              <span>
                Bank account details are confidential and restricted to authorized Payroll and HR administrators.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.BankName}
                  onChange={(e) => handleChange('BankName', e.target.value)}
                  placeholder="e.g. State Bank of India, HDFC"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={formData.BankBranch}
                  onChange={(e) => handleChange('BankBranch', e.target.value)}
                  placeholder="e.g. Tirupur Main Branch"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.AccountHolderName}
                  onChange={(e) => handleChange('AccountHolderName', e.target.value)}
                  placeholder="As per bank passbook"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={formData.AccountNumber}
                  onChange={(e) => handleChange('AccountNumber', e.target.value)}
                  placeholder="Account Number"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={formData.IFSCCode}
                  onChange={(e) => handleChange('IFSCCode', e.target.value.toUpperCase())}
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Type</label>
                <select
                  value={formData.AccountType}
                  onChange={(e) => handleChange('AccountType', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type} Account
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Section 6: Statutory Compliance (Sensitive) */}
        <div id="section-statutory" className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                6. Statutory Compliance & Identification
              </h2>
            </div>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
              Tax & Identity Compliance
            </span>
          </div>

          {!canAccessSensitiveData ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <Lock className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Aadhaar, PAN, PF, and ESI identifiers are restricted to compliance administrators.</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Card Number</label>
                  <input
                    type="text"
                    value={formData.AadhaarNumber}
                    onChange={(e) => handleChange('AadhaarNumber', e.target.value)}
                    placeholder="12-digit Aadhaar UID"
                    maxLength={14}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">UIDAI Indian National Identity</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Income Tax PAN Number</label>
                  <input
                    type="text"
                    value={formData.PANNumber}
                    onChange={(e) => handleChange('PANNumber', e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Permanent Account Number (10 chars)</span>
                </div>
              </div>

              {/* PF Details */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Provident Fund (EPF) Compliance</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.PFApplicable}
                      onChange={(e) => handleChange('PFApplicable', e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-indigo-700">PF Scheme Applicable</span>
                  </label>
                </div>

                {formData.PFApplicable && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Universal Account No (UAN)</label>
                      <input
                        type="text"
                        value={formData.PFUAN}
                        onChange={(e) => handleChange('PFUAN', e.target.value)}
                        placeholder="12-digit UAN"
                        maxLength={20}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">PF Member Account No</label>
                      <input
                        type="text"
                        value={formData.PFNumber}
                        onChange={(e) => handleChange('PFNumber', e.target.value)}
                        placeholder="e.g. TN/CBE/12345/678"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">PF Joining Date</label>
                      <input
                        type="date"
                        value={formData.PFJoiningDate}
                        onChange={(e) => handleChange('PFJoiningDate', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ESI Details */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Employee State Insurance (ESIC)</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.ESIApplicable}
                      onChange={(e) => handleChange('ESIApplicable', e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-indigo-700">ESI Scheme Applicable</span>
                  </label>
                </div>

                {formData.ESIApplicable && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">ESI Insurance Number (17-digit)</label>
                      <input
                        type="text"
                        value={formData.ESINumber}
                        onChange={(e) => handleChange('ESINumber', e.target.value)}
                        placeholder="17-digit ESI Number"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 7: Salary & Compensation (Sensitive) */}
        <div id="section-salary" className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                7. Salary & Compensation Package
              </h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              Salary Grade & Structure
            </span>
          </div>

          {!canAccessSensitiveData ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <Lock className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Compensation records are restricted to authorized management and HR roles.</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salary Grade / Band</label>
                  <input
                    type="text"
                    value={formData.SalaryGrade}
                    onChange={(e) => handleChange('SalaryGrade', e.target.value)}
                    placeholder="e.g. Band L2, Operator Grade 1"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Frequency</label>
                  <select
                    value={formData.PayFrequency}
                    onChange={(e) => handleChange('PayFrequency', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  >
                    {PAY_FREQUENCIES.map((freq) => (
                      <option key={freq} value={freq}>
                        {freq}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salary Effective From</label>
                  <input
                    type="date"
                    value={formData.SalaryEffectiveFrom}
                    onChange={(e) => handleChange('SalaryEffectiveFrom', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
                  Monthly Earnings Breakdown (₹)
                </span>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Basic Salary (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.BasicSalary}
                      onChange={(e) => handleChange('BasicSalary', e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">HRA Allowance (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.HRA}
                      onChange={(e) => handleChange('HRA', e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dearness Allowance (DA) (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.DA}
                      onChange={(e) => handleChange('DA', e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Other Allowances (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.OtherAllowances}
                      onChange={(e) => handleChange('OtherAllowances', e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <div className="w-full sm:w-64 rounded-lg bg-emerald-100/70 p-2.5 flex items-center justify-between border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-950">Gross Salary:</span>
                    <span className="font-mono text-sm font-extrabold text-emerald-900">
                      ₹ {parseFloat(formData.GrossSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions Breakdown */}
              <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-900 block">
                  Statutory & Standard Deductions (₹)
                </span>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Employee PF (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.EmployeePFContribution}
                      onChange={(e) => handleChange('EmployeePFContribution', e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Employee ESI (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.EmployeeESIContribution}
                      onChange={(e) => handleChange('EmployeeESIContribution', e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Professional Tax (PT) (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.ProfessionalTax}
                      onChange={(e) => handleChange('ProfessionalTax', e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Other Deductions (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.OtherDeductions}
                      onChange={(e) => handleChange('OtherDeductions', e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <div className="w-full sm:w-64 rounded-lg bg-indigo-100 p-2.5 flex items-center justify-between border border-indigo-200">
                    <span className="text-xs font-bold text-indigo-950">Net Take-Home Salary:</span>
                    <span className="font-mono text-sm font-extrabold text-indigo-900">
                      ₹ {parseFloat(formData.NetSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Salary Remarks / Notes</label>
                <input
                  type="text"
                  value={formData.SalaryRemarks}
                  onChange={(e) => handleChange('SalaryRemarks', e.target.value)}
                  placeholder="e.g. Annual revision approved by Director"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 8: Internal Remarks & Notes */}
        <div id="section-notes" className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              8. Internal Remarks & Administrative Notes
            </h2>
          </div>

          <div>
            <textarea
              rows={4}
              value={formData.Notes}
              onChange={(e) => handleChange('Notes', e.target.value)}
              placeholder="Any administrative notes, onboarding background, or HR remarks regarding this personnel record..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Form Submission Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>
              All updates are committed to DB2 <strong className="text-slate-700">Employee_Mst</strong> with
              transaction integrity. Core identifiers remain protected.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-6 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>{isEdit ? 'Save Profile Updates' : 'Create Staff Member'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddEditEmployeeScreen;
