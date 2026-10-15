export type ResourceSection={id:string;title:string;paragraphs:string[];items?:string[];note?:string};
export type ResourceEntry={kind:'article'|'guide';slug:string;category:string;title:string;summary:string;icon:'search'|'keywords'|'bookmark'|'history'|'file'|'lock'|'info';sections:ResourceSection[];related:string[]};
export const articles:ResourceEntry[]=[
  {
    "kind": "article",
    "slug": "write-a-clear-listing-title",
    "category": "Listing preparation",
    "title": "Write a title that describes your own product",
    "summary": "Keep the product, format, and distinguishing details clear without unsupported claims.",
    "icon": "file",
    "sections": [
      {
        "id": "describe",
        "title": "Start with what you actually sell",
        "paragraphs": [
          "Write a plain description of your own product. Include the material or format and a useful distinguishing detail.",
          "A handmade linen notebook and a printable planner need different information. Avoid claims that you cannot substantiate."
        ]
      },
      {
        "id": "review",
        "title": "Review the title as a person would read it",
        "paragraphs": [
          "Use the listing helper to count the characters in your own text. A length check does not assess search ranking or demand.",
          "Read it aloud, remove repeated words, and make sure the title agrees with your photos and description."
        ]
      },
      {
        "id": "keep",
        "title": "Save your own working version",
        "paragraphs": [
          "A free account can keep a manual draft with your title, description, tags, and notes. Saving a draft does not publish it to Etsy."
        ]
      }
    ],
    "related": [
      "/tools/listing-helper",
      "/help/saved-drafts"
    ]
  },
  {
    "kind": "article",
    "slug": "write-useful-product-details",
    "category": "Listing preparation",
    "title": "Describe what your buyer will actually receive",
    "summary": "Use your own knowledge of materials, dimensions, files, and delivery to write a useful description.",
    "icon": "file",
    "sections": [
      {
        "id": "details",
        "title": "Answer practical questions",
        "paragraphs": [
          "Describe the item, its dimensions, and its materials or file formats. State which parts are included and any important limitations.",
          "Write from your own product knowledge. Do not copy another seller’s wording or artwork."
        ]
      },
      {
        "id": "delivery",
        "title": "Explain the next step accurately",
        "paragraphs": [
          "State your actual processing and delivery practices. For digital products, describe the files and how the buyer can use them.",
          "The editor does not check whether your statements are true. Review each one yourself."
        ]
      },
      {
        "id": "notes",
        "title": "Keep review notes separate",
        "paragraphs": [
          "Use the notes in a saved manual draft for questions you still need to answer. Notes are your working record, not published listing text."
        ]
      }
    ],
    "related": [
      "/tools/listing-helper",
      "/workspace?section=drafts"
    ]
  },
  {
    "kind": "article",
    "slug": "choose-accurate-listing-tags",
    "category": "Listing preparation",
    "title": "Choose tags that describe your own item",
    "summary": "Review relevance, duplicates, and length using the text you enter.",
    "icon": "keywords",
    "sections": [
      {
        "id": "relevance",
        "title": "Start with accurate descriptions",
        "paragraphs": [
          "Think about your own item’s material, format, use, and style. Choose tags that describe those details.",
          "This is a manual writing exercise. podadd does not collect marketplace keywords or calculate competition."
        ]
      },
      {
        "id": "checks",
        "title": "Use the checks for their actual purpose",
        "paragraphs": [
          "The helper reports tag counts, repeated tags, and tags longer than its limit. It does not score opportunity, predict traffic, or recommend a ranking strategy."
        ]
      },
      {
        "id": "review",
        "title": "Keep your judgment in the process",
        "paragraphs": [
          "Remove unrelated words and repeat claims only when useful. Review your title, tags, and description together before you publish through your own seller workflow."
        ]
      }
    ],
    "related": [
      "/tools/listing-helper",
      "/help/prepare-a-listing"
    ]
  },
  {
    "kind": "article",
    "slug": "plan-your-own-product-costs",
    "category": "Cost planning",
    "title": "Plan a price from costs you understand",
    "summary": "Keep your price, fees, and assumptions visible in a manual calculation.",
    "icon": "file",
    "sections": [
      {
        "id": "inputs",
        "title": "Use numbers from your own work",
        "paragraphs": [
          "Enter production, packaging, shipping, and other costs you actually expect. Use one currency and one planning period.",
          "The planners do not load orders, another shop’s prices, or marketplace sales data."
        ]
      },
      {
        "id": "rates",
        "title": "Check the fee assumptions",
        "paragraphs": [
          "Review the calculator’s editable rates against the current rules for your own account. Include other charges yourself when needed.",
          "An estimate is not a statement, payout report, tax calculation, or forecast."
        ]
      },
      {
        "id": "compare",
        "title": "Change one assumption at a time",
        "paragraphs": [
          "Try a different price or cost while keeping the other assumptions visible. Use the result to ask a practical question, rather than treating a scenario as a promise of profit."
        ]
      }
    ],
    "related": [
      "/tools/etsy-fee-calculator",
      "/tools/profit-planner"
    ]
  },
  {
    "kind": "article",
    "slug": "keep-useful-draft-notes",
    "category": "Organization",
    "title": "Keep draft notes that help your next edit",
    "summary": "Organize your own decisions and unfinished questions without collecting marketplace data.",
    "icon": "bookmark",
    "sections": [
      {
        "id": "own",
        "title": "Keep the record about your own work",
        "paragraphs": [
          "Record which dimensions, materials, file formats, or usage terms still need checking. Keep buyer personal information out of working notes."
        ]
      },
      {
        "id": "next",
        "title": "Make the next step specific",
        "paragraphs": [
          "A useful note describes an action, such as verifying a file format or rewriting one paragraph. Local task reminders can hold your own reference and a due date."
        ]
      },
      {
        "id": "remove",
        "title": "Remove what you no longer need",
        "paragraphs": [
          "Delete unused account drafts and completed local tasks when they are no longer useful. Browser task data stays on this device; account drafts use private server storage."
        ]
      }
    ],
    "related": [
      "/help/saved-drafts",
      "/tools/followup-reminder"
    ]
  }
];
export const guides:ResourceEntry[]=[
  {
    "kind": "guide",
    "slug": "create-a-free-account",
    "category": "Getting started",
    "title": "Create a free account for your own drafts",
    "summary": "Sign in, accept the current terms, and keep manual listing drafts privately.",
    "icon": "lock",
    "sections": [
      {
        "id": "register",
        "title": "Create your account",
        "paragraphs": [
          "Use Create a free account, enter an email you control and a password, and accept the Terms of Use and Privacy Policy.",
          "Confirm your email when the page asks you to. There is no checkout or payment requirement."
        ]
      },
      {
        "id": "access",
        "title": "Use the account workspace",
        "paragraphs": [
          "The workspace stores drafts you enter yourself. Public calculators and editors can be used without an account.",
          "Creating an account does not authorize Etsy API access or enable a pending own-shop connection."
        ]
      },
      {
        "id": "help",
        "title": "Get help with access",
        "paragraphs": [
          "If you cannot sign in, check your details and confirmation email. Contact the operator from your registered email; do not send your password."
        ]
      }
    ],
    "related": [
      "/signup",
      "/contact"
    ]
  },
  {
    "kind": "guide",
    "slug": "prepare-a-listing",
    "category": "Listing preparation",
    "title": "Prepare your own title, tags, and description",
    "summary": "Understand the manual checks and review the product details yourself.",
    "icon": "file",
    "sections": [
      {
        "id": "input",
        "title": "Enter your own copy",
        "paragraphs": [
          "Open Listing preparation and type or paste text you wrote for your own product. Enter tags separated by commas or new lines."
        ]
      },
      {
        "id": "checks",
        "title": "Read the individual checks",
        "paragraphs": [
          "The tool reports title length, tag count, duplicate or long tags, and missing text. It does not fetch Etsy listings or predict ranking.",
          "Review your claims, dimensions, delivery information, and rights to your content yourself."
        ]
      },
      {
        "id": "output",
        "title": "Keep the result",
        "paragraphs": [
          "Copy or download the draft locally, or use the account draft editor to save your own working version. Nothing is published to Etsy by this tool."
        ]
      }
    ],
    "related": [
      "/tools/listing-helper",
      "/help/saved-drafts"
    ]
  },
  {
    "kind": "guide",
    "slug": "saved-drafts",
    "category": "Your account",
    "title": "Save and edit your own manual drafts",
    "summary": "Keep up to 30 private drafts containing information you enter.",
    "icon": "bookmark",
    "sections": [
      {
        "id": "save",
        "title": "Save a working version",
        "paragraphs": [
          "Open Listing drafts in your account. Give the draft a title, add your description, tags, and notes, then save it.",
          "Titles support 1–140 characters, descriptions up to 10,000, notes up to 2,000, and up to 13 tags of 20 characters each."
        ]
      },
      {
        "id": "private",
        "title": "Understand what is stored",
        "paragraphs": [
          "Drafts are associated with your account and encrypted in server storage. An optional own-listing link is a reference you supply; saving it does not fetch Etsy content.",
          "This is manual draft storage, not a listing importer, marketplace watchlist, or price-history database."
        ]
      },
      {
        "id": "delete",
        "title": "Delete drafts you no longer need",
        "paragraphs": [
          "Use the draft editor’s delete or clear action when appropriate. Saved drafts do not publish to Etsy or change your Etsy shop."
        ]
      }
    ],
    "related": [
      "/workspace?section=drafts",
      "/privacy"
    ]
  },
  {
    "kind": "guide",
    "slug": "manual-calculations",
    "category": "Cost planning",
    "title": "Use the fee and cost planners",
    "summary": "Enter your own numbers and check assumptions before relying on a result.",
    "icon": "file",
    "sections": [
      {
        "id": "manual",
        "title": "Use a consistent set of inputs",
        "paragraphs": [
          "Choose one currency and one period for your costs. Enter your own price, shipping, production costs, fees, and expenses."
        ]
      },
      {
        "id": "estimate",
        "title": "Read an estimate as an estimate",
        "paragraphs": [
          "Editable rates need to match your actual account. Include additional costs, taxes, refunds, or adjustments yourself when relevant.",
          "The tools do not request order records, infer another seller’s revenue, or guarantee profit."
        ]
      },
      {
        "id": "local",
        "title": "Keep your inputs private in this browser",
        "paragraphs": [
          "Calculator inputs stay in page memory. Reloading or leaving the page can clear them. These values are not imported from Etsy."
        ]
      }
    ],
    "related": [
      "/tools/etsy-fee-calculator",
      "/tools/profit-planner"
    ]
  },
  {
    "kind": "guide",
    "slug": "local-task-reminders",
    "category": "Organization",
    "title": "Keep local task reminders",
    "summary": "Add your own references and dates, then complete or export tasks.",
    "icon": "history",
    "sections": [
      {
        "id": "add",
        "title": "Add a task you control",
        "paragraphs": [
          "Enter your own task or order reference, a due date, and a brief note. Do not enter buyer names, addresses, or other sensitive information."
        ]
      },
      {
        "id": "storage",
        "title": "Understand this browser’s list",
        "paragraphs": [
          "Tasks are stored in local browser storage on this device. They are not synchronized to your account and do not access Etsy orders or send messages."
        ]
      },
      {
        "id": "export",
        "title": "Complete, remove, or export",
        "paragraphs": [
          "Edit a task, mark it complete, or delete it. Local CSV and calendar files contain your entered records; imported calendars control their own notifications."
        ]
      }
    ],
    "related": [
      "/tools/followup-reminder",
      "/privacy"
    ]
  },
  {
    "kind": "guide",
    "slug": "own-shop-connection",
    "category": "Optional connection",
    "title": "Understand the optional own-shop listing connection",
    "summary": "Manual tools work now; Etsy access has separate approval and consent requirements.",
    "icon": "lock",
    "sections": [
      {
        "id": "availability",
        "title": "Check availability first",
        "paragraphs": [
          "The optional own-shop connection is unavailable without approved access for the application’s current own-listing purpose and the corresponding configured credentials.",
          "A site configuration or an account’s consent is not an Etsy approval certificate. podadd does not promise approval."
        ]
      },
      {
        "id": "scope",
        "title": "Know the limited intended data flow",
        "paragraphs": [
          "When permitted, the connection uses Etsy OAuth to read descriptive active or draft listing fields from the authorized seller’s own shop.",
          "It does not provide marketplace research, other sellers’ analytics, buyer information, order summaries, listing history, or external marketing integration."
        ]
      },
      {
        "id": "controls",
        "title": "Keep control of access",
        "paragraphs": [
          "Review the requested permission before connecting. Disconnect removes locally saved access; revoke the app grant through Etsy as well when needed.",
          "Your manual drafts and public tools remain separate from the optional connection."
        ]
      }
    ],
    "related": [
      "/application",
      "/workspace?section=connections",
      "/etsy-docs"
    ]
  },
  {
    "kind": "guide",
    "slug": "privacy-and-data",
    "category": "Your account",
    "title": "Know where your own information goes",
    "summary": "Separate local tools, encrypted account drafts, and optional authorized listing access.",
    "icon": "info",
    "sections": [
      {
        "id": "local",
        "title": "Public tools stay local",
        "paragraphs": [
          "Editors and calculators use page memory. Local task reminders use this browser’s storage. Their local copy and download actions save only the information you enter."
        ]
      },
      {
        "id": "account",
        "title": "Account drafts use server storage",
        "paragraphs": [
          "Signing in uses the authentication service. Saving a manual draft sends its entered fields to the application’s server for encrypted account storage.",
          "There is no automatic import of competitor content or Etsy buyer records."
        ]
      },
      {
        "id": "control",
        "title": "Use the controls that fit the data",
        "paragraphs": [
          "Delete account drafts in the workspace. Delete reminders in the tool or clear the website’s browser storage. For other account-data requests, contact the operator using your registered email."
        ]
      }
    ],
    "related": [
      "/privacy",
      "/contact"
    ]
  },
  {
    "kind": "guide",
    "slug": "troubleshooting",
    "category": "Getting started",
    "title": "Troubleshoot a draft or unavailable connection",
    "summary": "Check your own inputs, account access, and the current availability message.",
    "icon": "info",
    "sections": [
      {
        "id": "draft",
        "title": "When a draft cannot be saved",
        "paragraphs": [
          "Check the title, tag, description, and note limits. Sign in and accept the current terms when requested.",
          "Keep a local copy of your own unsaved text before reloading."
        ]
      },
      {
        "id": "optional",
        "title": "When the own-shop connection is unavailable",
        "paragraphs": [
          "Manual tools and account drafts continue to work independently. Creating another account or repeatedly reconnecting will not grant application approval.",
          "Never paste credentials or provider passwords into draft text or support messages."
        ]
      },
      {
        "id": "support",
        "title": "Ask for useful help",
        "paragraphs": [
          "Contact the operator with the page, steps, and visible error message. Include no passwords, session tokens, or API secrets."
        ]
      }
    ],
    "related": [
      "/contact",
      "/help/saved-drafts"
    ]
  }
];
export function getResource(kind: ResourceEntry['kind'], slug: string) {
  return (kind === 'article' ? articles : guides).find(entry => entry.slug === slug);
}

export function resourceHref(entry: ResourceEntry) {
  return `/${entry.kind === 'article' ? 'blog' : 'help'}/${entry.slug}`;
}

export const brandIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect x="8" y="8" width="240" height="240" rx="60" fill="#4d50ce"/><circle cx="128" cy="128" r="78" fill="none" stroke="#fff" stroke-width="12"/><path d="m166 90-23 53-53 23 23-53 53-23Z" fill="#fff"/><circle cx="128" cy="128" r="9" fill="#4d50ce"/><path d="M128 39v13M217 128h-13M128 217v-13M39 128h13" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>';
export const brandWordmarkSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160" viewBox="0 0 640 160"><rect x="8" y="16" width="128" height="128" rx="32" fill="#4d50ce"/><circle cx="72" cy="80" r="41" fill="none" stroke="#fff" stroke-width="7"/><path d="m93 59-13 29-29 13 13-29 29-13Z" fill="#fff"/><circle cx="72" cy="80" r="5" fill="#4d50ce"/><text x="164" y="100" fill="#1e2440" font-family="Arial,Helvetica,sans-serif" font-size="64" font-weight="700" letter-spacing="-2">podadd<tspan fill="#4d50ce">.</tspan></text></svg>';
export function svgDownload(svg: string) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
