(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  const PAGE_GROUPS = [[1, 2, 3], [4, 5, 6, 7, 8, 9, 10, 11], [12, 13, 14, 15, 16, 17, 18], [19, 20, 21, 22]];

  const DEFAULT_TEMPLATE = {
    id: "59re-bilingual-tenancy-v1",
    name: "59 Real Estate Bilingual Tenancy Contract",
    version: 1,
    languagePriority: "Arabic",
    company: {
      lessorNameEn: "Fifty-Nine Real Estate",
      lessorNameAr: "شركة فيفتي ناين ريل استيت ذ.م.م",
      crNumber: "105675",
      poBox: "15",
      cityCountryEn: "Doha - Qatar",
      cityCountryAr: "الدوحة - قطر",
      representativeEn: "Hamad Mohammed Ismail Ali Emadi",
      representativeAr: "حمد محمد إسماعيل علي العمادي",
      maintenanceEmail: "sales.59re@iba.com.qa",
      maintenanceFax: "40403580",
      maintenancePhone: "50485111",
      annualIncreasePercent: "10"
    },
    clauses: [
      {
        number: 1,
        en: "Under this contract, the First Party leases {{unitDescriptionEn}} number ({{unitNumber}}) in {{propertyNameEn}}, Building ({{buildingNumber}}), located in Zone ({{zone}}), {{locationEn}}, Street ({{street}}), to the Second Party for {{purposeEn}}. (Electricity No.: {{electricityNumber}}, Water No.: {{waterNumber}}).",
        ar: "وفقاً لهذا العقد، قام الطرف الأول بتأجير {{unitDescriptionAr}} رقم ({{unitNumber}}) في {{propertyNameAr}}، مبنى رقم ({{buildingNumber}})، والكائن في منطقة ({{zone}})، {{locationAr}}، شارع ({{street}})، إلى الطرف الثاني بغرض {{purposeAr}}. (رقم الكهرباء: {{electricityNumber}}، ورقم الماء: {{waterNumber}})."
      },
      {
        number: 2,
        en: "The monthly rent for the premises is QAR {{monthlyRent}} ({{rentWordsEn}}), payable in advance by {{paymentMethodEn}}.",
        ar: "الإيجار الشهري للعين المؤجرة هو {{monthlyRent}} ريال قطري ({{rentWordsAr}})، ويتم دفعه مقدماً عن طريق {{paymentMethodAr}}."
      },
      {
        number: 3,
        en: "The term of this contract is {{termWordsEn}}, effective from {{startDate}} until {{endDate}}. Renewal shall be under a new contract and on terms agreed by both parties. The monthly rent may be increased by {{annualIncreasePercent}}% annually. If the Second Party does not wish to renew, written notice must be given to the Lessor at least {{noticeDays}} days before expiry.",
        ar: "مدة هذا العقد هي {{termWordsAr}}، وتبدأ من {{startDate}} وحتى {{endDate}}. ويتم التجديد بموجب عقد جديد ووفقاً للشروط التي يتفق عليها الطرفان، مع إمكانية إضافة {{annualIncreasePercent}}% سنوياً على قيمة الإيجار الشهري. وفي حال عدم رغبة الطرف الثاني في التجديد، يجب إخطار المؤجر كتابة قبل {{noticeDays}} يوماً على الأقل من انتهاء مدة العقد."
      },
      {
        number: 4,
        en: "The Second Party shall pay a security deposit of QAR {{securityDeposit}} ({{depositWordsEn}}) against the fitted appliances, decorations and any unpaid bills issued for the premises by Kahramaa and/or the First Party. The deposit shall be refunded at the end of the contract, provided the premises is returned in proper condition. The First Party may deduct unpaid rent, invoices or damages from the deposit.",
        ar: "يدفع الطرف الثاني مبلغ تأمين قدره {{securityDeposit}} ريال قطري ({{depositWordsAr}}) ضماناً للأجهزة والتجهيزات داخل العين المؤجرة ولتغطية أي فواتير مستحقة من كهرماء و/أو الطرف الأول. ويُرد مبلغ التأمين في نهاية العقد بشرط تسليم العين المؤجرة بحالة سليمة، وللطرف الأول خصم أي إيجار أو فواتير أو أضرار مستحقة من مبلغ التأمين."
      },
      {
        number: 5,
        en: "The Second Party acknowledges that the premises has been inspected and received in good and appropriate condition, with all agreed requirements.",
        ar: "يقر الطرف الثاني بأنه عاين العين المؤجرة وتسلمها بحالة جيدة ومناسبة ومستوفية للمتطلبات المتفق عليها."
      },
      {
        number: 6,
        en: "The Second Party undertakes to take proper care of the premises and use it only for the agreed purpose. The Second Party shall not leave flammable materials or use the premises in a way that may endanger it or violate the tenancy conditions.",
        ar: "يلتزم الطرف الثاني بالمحافظة على العين المؤجرة واستعمالها للغرض المتفق عليه فقط، وعدم ترك أي مواد قابلة للاشتعال أو استعمال العين بطريقة تعرضها للخطر أو تخالف شروط الإيجار."
      },
      {
        number: 7,
        en: "The Second Party may not make any structural, decorative or usage changes to the premises without the prior written approval of the First Party.",
        ar: "لا يجوز للطرف الثاني إجراء أي تغيير إنشائي أو تجميلي أو تغيير في استعمال العين المؤجرة إلا بعد الحصول على موافقة كتابية مسبقة من الطرف الأول."
      },
      {
        number: 8,
        en: "The Second Party may not transfer, assign or sublease the premises to any other person without the prior written approval of the First Party.",
        ar: "لا يحق للطرف الثاني التنازل عن العين المؤجرة أو تحويلها أو تأجيرها من الباطن لأي شخص آخر دون موافقة كتابية مسبقة من الطرف الأول."
      },
      {
        number: 9,
        en: "The Second Party shall ensure that other tenants and occupants are not disturbed by misconduct, negligence or unreasonable noise.",
        ar: "يلتزم الطرف الثاني بعدم إزعاج المستأجرين أو الشاغلين الآخرين نتيجة سوء السلوك أو الإهمال أو الضوضاء غير المقبولة."
      },
      {
        number: 10,
        en: "Pets and the use of Shisha are not permitted in the premises unless the First Party grants written approval.",
        ar: "لا يسمح بالحيوانات الأليفة أو استعمال الشيشة داخل العين المؤجرة إلا بموافقة كتابية من الطرف الأول."
      },
      {
        number: 11,
        en: "The tenant is solely responsible for loss or damage to personal contents caused by fire, flooding or any other incident inside the premises, and is responsible for obtaining insurance for personal contents.",
        ar: "يكون المستأجر وحده مسؤولاً عن أي فقد أو ضرر يلحق بمحتوياته الشخصية بسبب الحريق أو الفيضانات أو أي حادث آخر داخل العين المؤجرة، كما يتحمل مسؤولية التأمين على محتوياته الشخصية."
      },
      {
        number: 12,
        en: "The Second Party shall pay all utilities and service charges, including water, electricity and communication charges. Electricity and water accounts must be transferred to the tenant's name within two weeks of occupation. Any other consumable charge, tax or government fee relating to the tenancy shall be paid by the Second Party. If the First Party pays such an amount, the Second Party shall reimburse it within 30 days of the invoice date.",
        ar: "يتحمل الطرف الثاني جميع رسوم الخدمات، بما في ذلك الماء والكهرباء والاتصالات، ويلتزم بنقل حسابات الكهرباء والماء إلى اسمه خلال أسبوعين من تاريخ السكن. كما يتحمل أي رسوم استهلاكية أو ضرائب أو رسوم حكومية متعلقة بالإيجار. وإذا قام الطرف الأول بسداد أي مبلغ من هذه المبالغ، يلتزم الطرف الثاني برده خلال 30 يوماً من تاريخ الفاتورة."
      },
      {
        number: 13,
        en: "The Second Party is responsible for completing the procedures required to connect consumer services to the premises, including Kahramaa, gas, cooling and telecommunications services, within two weeks of occupation.",
        ar: "يتحمل الطرف الثاني مسؤولية استكمال إجراءات توصيل الخدمات الاستهلاكية إلى العين المؤجرة، بما في ذلك كهرماء والغاز وخدمات التبريد والاتصالات، خلال أسبوعين من تاريخ السكن."
      },
      {
        number: 14,
        en: "All maintenance requests shall be reported by email to {{maintenanceEmail}}, by fax to {{maintenanceFax}}, or by telephone on {{maintenancePhone}}.",
        ar: "يجب الإبلاغ عن جميع طلبات الصيانة عبر البريد الإلكتروني {{maintenanceEmail}}، أو الفاكس {{maintenanceFax}}، أو الاتصال على الرقم {{maintenancePhone}}."
      },
      {
        number: 15,
        en: "The Second Party is fully responsible for personal safety and the safety of family members while using any facility available in the building or property.",
        ar: "يكون الطرف الثاني مسؤولاً مسؤولية كاملة عن سلامته الشخصية وسلامة أفراد أسرته أثناء استخدام أي من المرافق المتوفرة في المبنى أو العقار."
      },
      {
        number: 16,
        en: "The Second Party shall be charged for the loss of or damage to any accessory, fixture or appliance supplied with the premises, based on the approved rates listed in Appendix (2) of this contract.",
        ar: "يتحمل الطرف الثاني تكلفة فقد أو تلف أي من الإكسسوارات أو التجهيزات أو الأجهزة المسلمة مع العين المؤجرة، وفقاً للأسعار المعتمدة الواردة في الملحق رقم (2) من هذا العقد."
      },
      {
        number: 17,
        en: "The First Party shall provide maintenance services for common systems and areas, including fire alarm and fire-fighting systems, lifts, HVAC, plumbing, electrical systems and common-area cleaning, subject to the responsibilities stated in this contract.",
        ar: "يلتزم الطرف الأول بتقديم خدمات صيانة الأنظمة والمناطق المشتركة، بما في ذلك أنظمة إنذار ومكافحة الحريق والمصاعد والتكييف والسباكة والكهرباء وتنظيف المناطق المشتركة، وذلك وفقاً للمسؤوليات المبينة في هذا العقد."
      },
      {
        number: 18,
        en: "The First Party may terminate this contract and require the Second Party to vacate the premises if: (a) rent remains unpaid for ten days after its due date; or (b) the Second Party breaches any condition of this contract or acts contrary to applicable rules of conduct. The Second Party shall compensate the First Party for resulting loss or damage.",
        ar: "يحق للطرف الأول فسخ هذا العقد ومطالبة الطرف الثاني بإخلاء العين المؤجرة إذا: (أ) تأخر سداد الإيجار لمدة عشرة أيام بعد تاريخ الاستحقاق؛ أو (ب) خالف الطرف الثاني أي شرط من شروط العقد أو تصرف بما يتعارض مع قواعد السلوك المعمول بها. ويلتزم الطرف الثاني بتعويض الطرف الأول عن أي خسارة أو ضرر ناتج."
      },
      {
        number: 19,
        en: "If the Second Party wishes to vacate before the end of the contract due to termination of employment or cancellation of the Qatari residence permit, the First Party must be officially notified at least two months before vacation. The Second Party shall pay two months' rent or the rent remaining for the contract term, whichever is less.",
        ar: "إذا رغب الطرف الثاني في إخلاء العين المؤجرة قبل نهاية العقد بسبب إنهاء الخدمة أو إلغاء تصريح الإقامة القطرية، فيجب إخطار الطرف الأول رسمياً قبل الإخلاء بشهرين على الأقل. ويلتزم الطرف الثاني بدفع قيمة إيجار شهرين أو قيمة الإيجار المتبقية من مدة العقد، أيهما أقل."
      },
      {
        number: 20,
        en: "The Second Party undertakes to return the premises in the same condition in which it was received, subject to normal wear and tear, and shall be liable for any damage caused by the Second Party, family members, occupants or visitors.",
        ar: "يلتزم الطرف الثاني بتسليم العين المؤجرة بالحالة التي استلمها عليها، مع مراعاة الاستهلاك العادي، ويتحمل مسؤولية أي ضرر يتسبب فيه هو أو أفراد أسرته أو الشاغلون أو الزوار."
      },
      {
        number: 21,
        en: "This contract is prepared in Arabic and translated into English. If there is any discrepancy between the two texts, the Arabic text shall prevail in accordance with the laws of the State of Qatar.",
        ar: "تم إعداد هذا العقد باللغة العربية وترجمته إلى اللغة الإنجليزية، وفي حال وجود أي تعارض بين النصين تكون الأولوية للنص العربي وفقاً لقوانين دولة قطر."
      },
      {
        number: 22,
        en: "This contract is executed in two original copies. Each party has received one copy to act upon legally.",
        ar: "حرر هذا العقد من نسختين أصليتين، وتسلم كل طرف نسخة للعمل بموجبها قانوناً."
      }
    ]
  };

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function contractDate(value) {
    if (!value) return "—";
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  }

  function numberWordsEnglish(value) {
    const n = Math.max(0, Math.round(Number(value) || 0));
    if (n === 0) return "Zero Qatari Riyals Only";
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    function underThousand(num) {
      const parts = [];
      if (num >= 100) {
        parts.push(`${ones[Math.floor(num / 100)]} Hundred`);
        num %= 100;
      }
      if (num >= 20) {
        parts.push(tens[Math.floor(num / 10)] + (num % 10 ? `-${ones[num % 10]}` : ""));
      } else if (num > 0) parts.push(ones[num]);
      return parts.join(" ");
    }
    const groups = [
      [1000000000, "Billion"],
      [1000000, "Million"],
      [1000, "Thousand"]
    ];
    let remainder = n;
    const parts = [];
    groups.forEach(([size, label]) => {
      if (remainder >= size) {
        parts.push(`${underThousand(Math.floor(remainder / size))} ${label}`);
        remainder %= size;
      }
    });
    if (remainder) parts.push(underThousand(remainder));
    return `${parts.join(" ")} Qatari Riyals Only`;
  }

  function numberWordsArabic(value) {
    return `فقط ${new Intl.NumberFormat("ar-QA", { maximumFractionDigits: 0 }).format(Math.max(0, Number(value) || 0))} ريال قطري لا غير`;
  }

  function termWords(startDate, endDate, language = "en") {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return language === "ar" ? "المدة المحددة" : "the stated period";
    let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    if (end.getDate() >= start.getDate() - 1) months += 1;
    months = Math.max(1, months);
    if (language === "ar") return months === 12 ? "اثنا عشر شهراً" : `${months} شهراً`;
    const names = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty", "Twenty-One", "Twenty-Two", "Twenty-Three", "Twenty-Four"];
    return `${names[months] || months} Month${months === 1 ? "" : "s"}`;
  }

  function fillTokens(text, details) {
    return String(text || "").replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => String(details[key] ?? "—"));
  }

  function buildDetails(bundle, template) {
    const { property, unit, tenant, contract } = bundle;
    const company = template.company || DEFAULT_TEMPLATE.company;
    const monthlyRent = Number(contract.monthlyRent || unit.rentValue || 0);
    const securityDeposit = Number(contract.securityDeposit || monthlyRent || 0);
    const paymentMethodEn = contract.expectedPaymentMethod || "Post-Dated Cheques";
    const paymentMethodAr = u.normalize(paymentMethodEn).includes("cheque") ? "شيكات آجلة" : paymentMethodEn;
    return {
      contractNumber: contract.contractNumber || "",
      contractDate: contractDate(contract.createdAt ? u.isoDate(new Date(contract.createdAt)) : u.isoDate()),
      lessorNameEn: company.lessorNameEn,
      lessorNameAr: company.lessorNameAr,
      crNumber: company.crNumber,
      poBox: company.poBox,
      cityCountryEn: company.cityCountryEn,
      cityCountryAr: company.cityCountryAr,
      representativeEn: company.representativeEn,
      representativeAr: company.representativeAr,
      tenantName: tenant?.name || "",
      tenantNameAr: tenant?.name || "",
      qidOrCr: tenant?.qidOrCr || "",
      mobile: tenant?.mobile || "",
      email: tenant?.email || "",
      unitDescriptionEn: unit.aptType || "Unit",
      unitDescriptionAr: unit.aptType?.toLowerCase().includes("villa") ? "فيلا" : unit.aptType?.toLowerCase().includes("shop") ? "محل تجاري" : "وحدة سكنية",
      unitNumber: unit.unitNumber || "",
      propertyNameEn: property.name || "",
      propertyNameAr: property.name || "",
      buildingNumber: property.code || "—",
      zone: property.zone || "—",
      street: property.street || "—",
      locationEn: property.location || "Doha",
      locationAr: property.location || "الدوحة",
      purposeEn: unit.aptType?.toLowerCase().includes("commercial") || unit.aptType?.toLowerCase().includes("shop") ? "commercial use" : "one-family accommodation",
      purposeAr: unit.aptType?.toLowerCase().includes("commercial") || unit.aptType?.toLowerCase().includes("shop") ? "الاستخدام التجاري" : "سكن عائلة واحدة",
      electricityNumber: unit.kahramaa?.electricityNumber || "—",
      waterNumber: unit.kahramaa?.waterNumber || "—",
      monthlyRent: new Intl.NumberFormat("en-QA", { maximumFractionDigits: 2 }).format(monthlyRent),
      monthlyRentValue: monthlyRent,
      rentWordsEn: numberWordsEnglish(monthlyRent),
      rentWordsAr: numberWordsArabic(monthlyRent),
      securityDeposit: new Intl.NumberFormat("en-QA", { maximumFractionDigits: 2 }).format(securityDeposit),
      securityDepositValue: securityDeposit,
      depositWordsEn: numberWordsEnglish(securityDeposit),
      depositWordsAr: numberWordsArabic(securityDeposit),
      paymentMethodEn,
      paymentMethodAr,
      startDate: contractDate(contract.startDate),
      startDateISO: contract.startDate,
      endDate: contractDate(contract.endDate),
      endDateISO: contract.endDate,
      termWordsEn: termWords(contract.startDate, contract.endDate, "en"),
      termWordsAr: termWords(contract.startDate, contract.endDate, "ar"),
      annualIncreasePercent: String(company.annualIncreasePercent || 10),
      noticeDays: String(contract.noticePeriodDays || 60),
      maintenanceEmail: company.maintenanceEmail,
      maintenanceFax: company.maintenanceFax,
      maintenancePhone: company.maintenancePhone
    };
  }

  function buildDocument(bundle, template, existing = null) {
    if (existing?.clauses?.length) return deepClone(existing);
    const details = buildDetails(bundle, template);
    return {
      id: `document-${bundle.contract.id}`,
      contractId: bundle.contract.id,
      templateId: template.id,
      templateVersion: template.version,
      version: 1,
      status: "draft",
      details,
      clauses: template.clauses.map((clause) => ({
        number: clause.number,
        en: fillTokens(clause.en, details),
        ar: fillTokens(clause.ar, details)
      })),
      createdAt: Date.now(),
      createdBy: root.state.user?.id || "system",
      updatedAt: Date.now(),
      updatedBy: root.state.user?.id || "system"
    };
  }

  function normalizeTemplate(template) {
    const merged = deepClone(DEFAULT_TEMPLATE);
    if (!template) return merged;
    merged.id = template.id || merged.id;
    merged.name = template.name || merged.name;
    merged.version = Number(template.version || merged.version);
    merged.languagePriority = template.languagePriority || merged.languagePriority;
    merged.company = { ...merged.company, ...(template.company || {}) };
    if (Array.isArray(template.clauses) && template.clauses.length === 22) merged.clauses = template.clauses.map((item, index) => ({ number: Number(item.number || index + 1), en: String(item.en || ""), ar: String(item.ar || "") }));
    return merged;
  }

  async function getTemplate() {
    return normalizeTemplate(await root.data.getContractTemplate());
  }

  function escapeMultiline(value) {
    return u.escapeHTML(String(value ?? "")).replace(/\n/g, "<br>");
  }

  function renderLogoHeader(pageNumber, totalPages, document) {
    return `<header class="contract-paper-header">
      <div class="contract-paper-title" dir="ltr">TENANCY CONTRACT</div>
      <img src="${new URL("assets/logo-horizontal-light.svg", window.location.href).href}" alt="59 Real Estate">
      <div class="contract-paper-title contract-paper-title-ar" dir="rtl">عقـــد إيجـــار</div>
      <div class="contract-paper-reference">${u.escapeHTML(document.details.contractNumber || "")} · Page ${pageNumber} of ${totalPages}</div>
    </header>`;
  }

  function renderParties(details) {
    return `<section class="contract-parties contract-bilingual-row">
      <div class="contract-language contract-language-en" dir="ltr">
        <h3>This contract is made by and between:</h3>
        <p><strong>1. M/s. ${u.escapeHTML(details.lessorNameEn)}</strong><br>C.R. ${u.escapeHTML(details.crNumber)}, P.O. Box ${u.escapeHTML(details.poBox)}, ${u.escapeHTML(details.cityCountryEn)}<br>Represented by ${u.escapeHTML(details.representativeEn)}, hereinafter referred to as the <strong>First Party (The Lessor)</strong>.</p>
        <p><strong>2. ${u.escapeHTML(details.tenantName)}</strong><br>ID / C.R. Number: ${u.escapeHTML(details.qidOrCr || "—")}<br>Mobile: ${u.escapeHTML(details.mobile || "—")}<br>Email: ${u.escapeHTML(details.email || "—")}<br>Hereinafter referred to as the <strong>Second Party (The Lessee)</strong>.</p>
        <p>Both parties acknowledge their legal capacity and mutually agree as follows:</p>
      </div>
      <div class="contract-language contract-language-ar" dir="rtl">
        <h3>تم تحرير عقد الإيجار بين كل من:</h3>
        <p><strong>1. السادة / ${u.escapeHTML(details.lessorNameAr)}</strong><br>س.ت: ${u.escapeHTML(details.crNumber)}، ص.ب: ${u.escapeHTML(details.poBox)}، ${u.escapeHTML(details.cityCountryAr)}<br>ويمثلها السيد / ${u.escapeHTML(details.representativeAr)}، ويشار إليه لاحقاً بالطرف الأول <strong>(المؤجر)</strong>.</p>
        <p><strong>2. السيد / السيدة: ${u.escapeHTML(details.tenantNameAr || details.tenantName)}</strong><br>رقم البطاقة / السجل التجاري: ${u.escapeHTML(details.qidOrCr || "—")}<br>رقم الهاتف: ${u.escapeHTML(details.mobile || "—")}<br>البريد الإلكتروني: ${u.escapeHTML(details.email || "—")}<br>ويشار إليه لاحقاً بالطرف الثاني <strong>(المستأجر)</strong>.</p>
        <p>أقر الطرفان بأهليتهما القانونية للتعاقد واتفقا على ما يلي:</p>
      </div>
    </section>`;
  }

  function renderClause(clause) {
    return `<article class="contract-clause contract-bilingual-row" data-clause-number="${clause.number}">
      <div class="contract-language contract-language-en" dir="ltr"><b class="contract-clause-number">${clause.number}.</b><p>${escapeMultiline(clause.en)}</p></div>
      <div class="contract-language contract-language-ar" dir="rtl"><b class="contract-clause-number">.${clause.number}</b><p>${escapeMultiline(clause.ar)}</p></div>
    </article>`;
  }

  function renderSignatures() {
    return `<section class="contract-signatures">
      <div><strong dir="rtl">طرف ثاني (المستأجر)</strong><strong>Second Party (The Lessee)</strong><span></span></div>
      <div><strong dir="rtl">طرف أول (المؤجر)</strong><strong>First Party (The Lessor)</strong><span></span></div>
    </section>`;
  }

  function renderPages(document) {
    const totalPages = PAGE_GROUPS.length;
    return PAGE_GROUPS.map((numbers, pageIndex) => {
      const clauses = document.clauses.filter((item) => numbers.includes(Number(item.number)));
      return `<section class="contract-paper-page ${document.status !== "final" ? "is-draft" : ""}">
        ${renderLogoHeader(pageIndex + 1, totalPages, document)}
        ${pageIndex === 0 ? renderParties(document.details) : ""}
        <main class="contract-paper-content">${clauses.map(renderClause).join("")}</main>
        ${pageIndex === totalPages - 1 ? renderSignatures() : ""}
        <footer class="contract-paper-footer"><span>59 Real Estate · ${u.escapeHTML(document.details.contractNumber || "Tenancy Contract")}</span><span>${document.status === "final" ? "FINAL" : "DRAFT"} · Version ${Number(document.version || 1)}</span></footer>
      </section>`;
    }).join("");
  }

  function openPrintWindow(bundle, document) {
    const popup = window.open("", "_blank", root.ui.isMobile() ? "" : "width=1100,height=900");
    if (!popup) return root.ui.toast("Allow pop-ups to preview the bilingual contract.", "error");
    const cssURL = new URL("styles/contract-document.css?v=0.8.8", window.location.href).href;
    const title = `Contract ${document.details.contractNumber || bundle.contract.contractNumber}`;
    popup.document.write(`<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${u.escapeHTML(title)}</title><link rel="stylesheet" href="${cssURL}"></head><body class="contract-print-window"><div class="contract-document-toolbar"><div><strong>${u.escapeHTML(title)}</strong><span>Review all four pages before printing or saving as PDF.</span></div><button type="button" onclick="window.print()">Print / Save PDF</button><button type="button" onclick="window.close()">Close</button></div><div class="contract-print-pages">${renderPages(document)}</div></body></html>`);
    popup.document.close();
  }

  function documentStatusLabel(status) {
    return status === "final" ? "Approved & Locked" : status === "approved" ? "Approved" : "Draft";
  }

  function detailInput(key, label, value, options = {}) {
    const type = options.type || "text";
    const span = options.span ? " span-2" : "";
    const direction = options.rtl ? " dir=\"rtl\"" : "";
    const readonly = options.readonly ? " readonly" : "";
    return `<label class="${span.trim()}"><span>${u.escapeHTML(label)}</span><input data-contract-detail="${u.escapeHTML(key)}" type="${type}" value="${u.escapeHTML(value ?? "")}"${direction}${readonly}></label>`;
  }

  function renderDetailsEditor(document, locked) {
    const d = document.details;
    return `<div class="contract-editor-groups">
      <section class="contract-editor-group"><header><h3>Company & Lessor</h3><p>Official company information used in both languages.</p></header><div class="form-grid">
        ${detailInput("contractNumber", "Contract number", d.contractNumber, { readonly: locked })}
        ${detailInput("contractDate", "Contract date", d.contractDate, { readonly: locked })}
        ${detailInput("lessorNameEn", "Lessor name - English", d.lessorNameEn, { readonly: locked })}
        ${detailInput("lessorNameAr", "اسم المؤجر - العربية", d.lessorNameAr, { rtl: true, readonly: locked })}
        ${detailInput("crNumber", "C.R. number", d.crNumber, { readonly: locked })}
        ${detailInput("poBox", "P.O. Box", d.poBox, { readonly: locked })}
        ${detailInput("representativeEn", "Representative - English", d.representativeEn, { readonly: locked })}
        ${detailInput("representativeAr", "اسم الممثل - العربية", d.representativeAr, { rtl: true, readonly: locked })}
      </div></section>
      <section class="contract-editor-group"><header><h3>Tenant</h3><p>Auto-filled from the active tenant. Changes here affect this contract document only.</p></header><div class="form-grid">
        ${detailInput("tenantName", "Tenant name - English", d.tenantName, { readonly: locked })}
        ${detailInput("tenantNameAr", "اسم المستأجر - العربية", d.tenantNameAr, { rtl: true, readonly: locked })}
        ${detailInput("qidOrCr", "QID / C.R.", d.qidOrCr, { readonly: locked })}
        ${detailInput("mobile", "Mobile", d.mobile, { readonly: locked })}
        ${detailInput("email", "Email", d.email, { type: "email", span: true, readonly: locked })}
      </div></section>
      <section class="contract-editor-group"><header><h3>Premises</h3><p>Property, unit and utility information appearing in clause 1.</p></header><div class="form-grid">
        ${detailInput("propertyNameEn", "Property - English", d.propertyNameEn, { readonly: locked })}
        ${detailInput("propertyNameAr", "العقار - العربية", d.propertyNameAr, { rtl: true, readonly: locked })}
        ${detailInput("unitDescriptionEn", "Unit description - English", d.unitDescriptionEn, { readonly: locked })}
        ${detailInput("unitDescriptionAr", "وصف الوحدة - العربية", d.unitDescriptionAr, { rtl: true, readonly: locked })}
        ${detailInput("unitNumber", "Unit number", d.unitNumber, { readonly: locked })}
        ${detailInput("buildingNumber", "Building number", d.buildingNumber, { readonly: locked })}
        ${detailInput("zone", "Zone", d.zone, { readonly: locked })}
        ${detailInput("street", "Street", d.street, { readonly: locked })}
        ${detailInput("locationEn", "Location - English", d.locationEn, { readonly: locked })}
        ${detailInput("locationAr", "الموقع - العربية", d.locationAr, { rtl: true, readonly: locked })}
        ${detailInput("purposeEn", "Purpose - English", d.purposeEn, { readonly: locked })}
        ${detailInput("purposeAr", "الغرض - العربية", d.purposeAr, { rtl: true, readonly: locked })}
        ${detailInput("electricityNumber", "Electricity number", d.electricityNumber, { readonly: locked })}
        ${detailInput("waterNumber", "Water number", d.waterNumber, { readonly: locked })}
      </div></section>
      <section class="contract-editor-group"><header><h3>Rent, Deposit & Term</h3><p>Contract figures and dates used in clauses 2, 3 and 4.</p></header><div class="form-grid">
        ${detailInput("monthlyRent", "Monthly rent (formatted)", d.monthlyRent, { readonly: locked })}
        ${detailInput("securityDeposit", "Security deposit (formatted)", d.securityDeposit, { readonly: locked })}
        ${detailInput("rentWordsEn", "Rent in words - English", d.rentWordsEn, { readonly: locked })}
        ${detailInput("rentWordsAr", "الإيجار كتابة - العربية", d.rentWordsAr, { rtl: true, readonly: locked })}
        ${detailInput("depositWordsEn", "Deposit in words - English", d.depositWordsEn, { readonly: locked })}
        ${detailInput("depositWordsAr", "التأمين كتابة - العربية", d.depositWordsAr, { rtl: true, readonly: locked })}
        ${detailInput("startDate", "Start date", d.startDate, { readonly: locked })}
        ${detailInput("endDate", "End date", d.endDate, { readonly: locked })}
        ${detailInput("termWordsEn", "Term - English", d.termWordsEn, { readonly: locked })}
        ${detailInput("termWordsAr", "المدة - العربية", d.termWordsAr, { rtl: true, readonly: locked })}
        ${detailInput("paymentMethodEn", "Payment method - English", d.paymentMethodEn, { readonly: locked })}
        ${detailInput("paymentMethodAr", "طريقة الدفع - العربية", d.paymentMethodAr, { rtl: true, readonly: locked })}
        ${detailInput("annualIncreasePercent", "Annual increase %", d.annualIncreasePercent, { readonly: locked })}
        ${detailInput("noticeDays", "Notice period (days)", d.noticeDays, { readonly: locked })}
      </div></section>
      <section class="contract-editor-group"><header><h3>Maintenance Contact</h3><p>Contact information used in clause 14.</p></header><div class="form-grid">
        ${detailInput("maintenanceEmail", "Maintenance email", d.maintenanceEmail, { type: "email", readonly: locked })}
        ${detailInput("maintenanceFax", "Fax", d.maintenanceFax, { readonly: locked })}
        ${detailInput("maintenancePhone", "Phone", d.maintenancePhone, { span: true, readonly: locked })}
      </div></section>
    </div>`;
  }

  function renderClauseEditors(document, locked) {
    return `<div class="contract-editor-note"><strong>Paired bilingual clauses</strong><span>Edit the English and matching Arabic wording together. The Arabic text remains the controlling language under clause 21.</span></div>${PAGE_GROUPS.map((numbers, pageIndex) => `<section class="contract-clause-group"><header><h3>Page ${pageIndex + 1} clauses</h3><span>${numbers[0]}-${numbers[numbers.length - 1]}</span></header>${document.clauses.filter((item) => numbers.includes(Number(item.number))).map((clause) => `<article class="contract-clause-editor"><div class="contract-clause-editor-number">${clause.number}</div><label><span>English</span><textarea data-contract-clause-en="${clause.number}" ${locked ? "readonly" : ""}>${u.escapeHTML(clause.en)}</textarea></label><label class="rtl-field"><span>العربية</span><textarea data-contract-clause-ar="${clause.number}" dir="rtl" ${locked ? "readonly" : ""}>${u.escapeHTML(clause.ar)}</textarea></label></article>`).join("")}</section>`).join("")}`;
  }

  async function openEditor(bundle, options = {}) {
    if (!bundle?.contract || !bundle?.tenant) return root.ui.toast("An active tenant and contract are required.", "error");
    const template = await getTemplate();
    let document = buildDocument(bundle, template, bundle.contract.contractDocument);
    let activeTab = options.initialTab || "details";
    const canEdit = root.auth.can("contract") || root.auth.can("admin");
    const canApprove = ["ceo", "admin"].includes(root.state.user?.role);
    const isAdmin = root.auth.can("admin");

    const instance = root.ui.openModal({
      title: "Bilingual Tenancy Contract",
      eyebrow: `${bundle.property.name} · ${bundle.unit.unitNumber}`,
      size: "wide",
      content: `<div class="contract-editor-shell"></div>`,
      footer: `<button class="button button-secondary" data-contract-close>Close</button><button class="button button-secondary" data-contract-refresh>Refresh auto-filled clauses</button><button class="button button-secondary" data-contract-preview>Preview / PDF</button><button class="button button-primary" data-contract-save>Save Draft</button><button class="button button-accent" data-contract-approve>Approve & Lock</button><button class="button button-danger" data-contract-reopen>Reopen Contract</button>`
    });

    function locked() { return document.status === "final"; }

    function updateFooter() {
      const footer = instance.modal.querySelector(".modal-footer");
      footer.querySelector("[data-contract-refresh]").classList.toggle("is-hidden", !canEdit || locked());
      footer.querySelector("[data-contract-save]").classList.toggle("is-hidden", !canEdit || locked());
      footer.querySelector("[data-contract-approve]").classList.toggle("is-hidden", !canApprove || locked());
      footer.querySelector("[data-contract-reopen]").classList.toggle("is-hidden", !isAdmin || !locked());
    }

    function updateDocumentFromInputs() {
      instance.modal.querySelectorAll("[data-contract-detail]").forEach((input) => { document.details[input.dataset.contractDetail] = input.value; });
      instance.modal.querySelectorAll("[data-contract-clause-en]").forEach((input) => {
        const clause = document.clauses.find((item) => Number(item.number) === Number(input.dataset.contractClauseEn));
        if (clause) clause.en = input.value;
      });
      instance.modal.querySelectorAll("[data-contract-clause-ar]").forEach((input) => {
        const clause = document.clauses.find((item) => Number(item.number) === Number(input.dataset.contractClauseAr));
        if (clause) clause.ar = input.value;
      });
    }

    function draw() {
      const shell = instance.modal.querySelector(".contract-editor-shell");
      shell.innerHTML = `<div class="contract-editor-summary"><div><span>Contract</span><strong>${u.escapeHTML(document.details.contractNumber || bundle.contract.contractNumber)}</strong></div><div><span>Document status</span><strong class="contract-document-status ${document.status}">${documentStatusLabel(document.status)}</strong></div><div><span>Template</span><strong>Version ${Number(document.templateVersion || 1)}</strong></div><div><span>Arabic priority</span><strong>Enabled</strong></div></div><nav class="contract-editor-tabs"><button class="${activeTab === "details" ? "active" : ""}" data-contract-tab="details">Contract Details</button><button class="${activeTab === "clauses" ? "active" : ""}" data-contract-tab="clauses">Bilingual Clauses</button><button class="${activeTab === "preview" ? "active" : ""}" data-contract-tab="preview">Four-Page Preview</button></nav><section class="contract-editor-panel">${activeTab === "details" ? renderDetailsEditor(document, locked() || !canEdit) : activeTab === "clauses" ? renderClauseEditors(document, locked() || !canEdit) : `<div class="contract-preview-stage">${renderPages(document)}</div>`}</section>`;
      shell.querySelectorAll("[data-contract-tab]").forEach((button) => button.addEventListener("click", () => { updateDocumentFromInputs(); activeTab = button.dataset.contractTab; draw(); }));
      shell.querySelectorAll("[data-contract-detail]").forEach((input) => input.addEventListener("input", () => { document.details[input.dataset.contractDetail] = input.value; }));
      shell.querySelectorAll("[data-contract-clause-en]").forEach((input) => input.addEventListener("input", () => { const clause = document.clauses.find((item) => Number(item.number) === Number(input.dataset.contractClauseEn)); if (clause) clause.en = input.value; }));
      shell.querySelectorAll("[data-contract-clause-ar]").forEach((input) => input.addEventListener("input", () => { const clause = document.clauses.find((item) => Number(item.number) === Number(input.dataset.contractClauseAr)); if (clause) clause.ar = input.value; }));
      updateFooter();
    }

    instance.modal.querySelector("[data-contract-close]").addEventListener("click", () => { instance.close(); options.returnToUnit !== false && root.modules.unitDetail.open(bundle.unit.id, "contract"); });
    instance.modal.querySelector("[data-contract-preview]").addEventListener("click", () => { updateDocumentFromInputs(); openPrintWindow(bundle, document); });
    instance.modal.querySelector("[data-contract-refresh]").addEventListener("click", async () => {
      updateDocumentFromInputs();
      const confirmed = await root.ui.confirm({ title: "Refresh auto-filled wording", message: "Replace all 22 clause texts using the current details and active master template? Manual clause edits will be overwritten.", confirmLabel: "Refresh clauses", danger: true });
      if (!confirmed) return;
      document.clauses = template.clauses.map((clause) => ({ number: clause.number, en: fillTokens(clause.en, document.details), ar: fillTokens(clause.ar, document.details) }));
      activeTab = "clauses";
      draw();
      root.ui.toast("All bilingual clauses were refreshed from the template.", "success");
    });
    instance.modal.querySelector("[data-contract-save]").addEventListener("click", async () => {
      updateDocumentFromInputs();
      try {
        root.ui.showLoading("Saving bilingual contract…");
        document = (await root.data.saveContractDocument(bundle.contract.id, document)).contractDocument;
        bundle.contract.contractDocument = deepClone(document);
        draw();
        root.ui.toast("Contract draft saved.", "success");
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });
    instance.modal.querySelector("[data-contract-approve]").addEventListener("click", async () => {
      updateDocumentFromInputs();
      const confirmed = await root.ui.confirm({ title: "Approve and lock contract", message: "The bilingual contract will be locked as a final legal snapshot. Later changes require an Administrator to reopen it.", confirmLabel: "Approve & Lock" });
      if (!confirmed) return;
      try {
        root.ui.showLoading("Approving contract…");
        document = (await root.data.approveContractDocument(bundle.contract.id, document)).contractDocument;
        bundle.contract.contractDocument = deepClone(document);
        draw();
        root.ui.toast("Contract approved and locked.", "success");
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });
    instance.modal.querySelector("[data-contract-reopen]").addEventListener("click", async () => {
      const confirmed = await root.ui.confirm({ title: "Reopen final contract", message: "Reopening creates a new editable document version. The previous final version remains recorded in the audit history.", confirmLabel: "Reopen", danger: true });
      if (!confirmed) return;
      try {
        document = (await root.data.reopenContractDocument(bundle.contract.id)).contractDocument;
        bundle.contract.contractDocument = deepClone(document);
        activeTab = "details";
        draw();
        root.ui.toast("Contract reopened as a new draft version.", "success");
      } catch (error) { root.ui.toast(error.message, "error"); }
    });

    draw();
  }

  async function printContract(bundle) {
    if (!bundle?.contract || !bundle?.tenant) return root.ui.toast("No active contract to preview.", "error");
    const template = await getTemplate();
    const document = buildDocument(bundle, template, bundle.contract.contractDocument);
    openPrintWindow(bundle, document);
  }

  async function openTemplateEditor() {
    if (!root.auth.can("admin")) return root.ui.toast("Administrator access is required.", "error");
    let template = await getTemplate();
    const instance = root.ui.openModal({
      title: "Bilingual Contract Template",
      eyebrow: "ADMINISTRATOR · LEGAL TEMPLATE",
      size: "wide",
      content: `<div class="contract-template-editor"><div class="contract-editor-note warning"><strong>Controlled legal template</strong><span>Changes apply only to new or refreshed draft contracts. Existing approved contracts remain unchanged. Obtain legal approval for both languages before production use.</span></div><section class="contract-editor-group"><header><h3>Company & Contact Defaults</h3></header><div class="form-grid">${Object.entries(template.company).map(([key, value]) => detailInput(key, key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()), value, { rtl: key.endsWith("Ar") })).join("")}</div></section><div class="contract-editor-note"><strong>Supported placeholders</strong><span>{{tenantName}}, {{unitNumber}}, {{propertyNameEn}}, {{monthlyRent}}, {{startDate}}, {{endDate}}, {{maintenanceEmail}} and the other fields listed in Contract Details.</span></div>${template.clauses.map((clause) => `<article class="contract-clause-editor"><div class="contract-clause-editor-number">${clause.number}</div><label><span>English template</span><textarea data-template-clause-en="${clause.number}">${u.escapeHTML(clause.en)}</textarea></label><label class="rtl-field"><span>قالب العربية</span><textarea data-template-clause-ar="${clause.number}" dir="rtl">${u.escapeHTML(clause.ar)}</textarea></label></article>`).join("")}</div>`,
      footer: `<button class="button button-secondary" data-template-cancel>Cancel</button><button class="button button-secondary" data-template-reset>Restore supplied contract</button><button class="button button-primary" data-template-save>Save New Template Version</button>`
    });
    instance.modal.querySelector("[data-template-cancel]").addEventListener("click", instance.close);
    instance.modal.querySelector("[data-template-reset]").addEventListener("click", async () => {
      if (!await root.ui.confirm({ title: "Restore supplied contract template", message: "Replace the current editable template with the bilingual wording prepared from the uploaded company contract?", confirmLabel: "Restore", danger: true })) return;
      template = deepClone(DEFAULT_TEMPLATE);
      instance.close();
      await openTemplateEditorWithTemplate(template);
    });
    instance.modal.querySelector("[data-template-save]").addEventListener("click", async () => {
      instance.modal.querySelectorAll("[data-contract-detail]").forEach((input) => { template.company[input.dataset.contractDetail] = input.value; });
      instance.modal.querySelectorAll("[data-template-clause-en]").forEach((input) => { const clause = template.clauses.find((item) => Number(item.number) === Number(input.dataset.templateClauseEn)); if (clause) clause.en = input.value; });
      instance.modal.querySelectorAll("[data-template-clause-ar]").forEach((input) => { const clause = template.clauses.find((item) => Number(item.number) === Number(input.dataset.templateClauseAr)); if (clause) clause.ar = input.value; });
      template.version = Number(template.version || 1) + 1;
      try {
        await root.data.saveContractTemplate(template);
        root.ui.toast(`Contract template version ${template.version} saved.`, "success");
        instance.close();
      } catch (error) { root.ui.toast(error.message, "error"); }
    });
  }

  async function openTemplateEditorWithTemplate(template) {
    await root.data.saveContractTemplate({ ...template, version: Math.max(1, Number(template.version || 1)) });
    return openTemplateEditor();
  }

  root.modules.contractDocument = {
    DEFAULT_TEMPLATE,
    buildDocument,
    openEditor,
    openTemplateEditor,
    printContract,
    renderPages
  };
})();
