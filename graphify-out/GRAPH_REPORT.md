# Graph Report - divulgadorlinks  (2026-10-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 6629 nodes · 21894 edges · 231 communities (194 shown, 37 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 288 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a9d7c494`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 199
- Community 222

## God Nodes (most connected - your core abstractions)
1. `ActionIcon()` - 270 edges
2. `Button()` - 235 edges
3. `react` - 190 edges
4. `Field()` - 160 edges
5. `ProfileError` - 150 edges
6. `@prisma/client` - 144 edges
7. `Input()` - 115 edges
8. `buildError()` - 109 edges
9. `resolveTenant()` - 105 edges
10. `WorkspaceActions()` - 104 edges

## Surprising Connections (you probably didn't know these)
- `stub` --indirect_call--> `ownershipFile()`  [INFERRED]
  frontend/e2e/serve.mjs → backend/src/domain/verification/ownership.ts
- `"profile_billing_settings"` --references--> `"tenants"`  [EXTRACTED]
  backend/prisma/migrations/20261018010000_profile_billing/migration.sql → backend/prisma/migrations/20260929191730_tenant_user_identifiers/migration.sql
- `profile_assets` --references--> `"users"`  [EXTRACTED]
  backend/prisma/migrations/20261016160000_public_profiles/migration.sql → backend/prisma/migrations/20260929191730_tenant_user_identifiers/migration.sql
- `links_tenantId_status_id_idx` --indexes--> `"links"`  [EXTRACTED]
  backend/prisma/migrations/20260930140000_order_br_code_and_catalog_indexes/migration.sql → backend/prisma/migrations/20260929220000_links_and_blocklist/migration.sql
- `links_digest_selection_idx` --indexes--> `"links"`  [EXTRACTED]
  backend/prisma/migrations/20261019080000_niche_digests/migration.sql → backend/prisma/migrations/20260929220000_links_and_blocklist/migration.sql

## Import Cycles
- 4-file cycle: `frontend/src/components/layout/workspace-loading-content.tsx -> frontend/src/features/profile-assistant/assistant-screen.tsx -> frontend/src/features/account/components/area-frame.tsx -> frontend/src/features/account/components/workspace-pending.tsx -> frontend/src/components/layout/workspace-loading-content.tsx`

## Communities (231 total, 37 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (181): buyersCsv(), cell(), ordersCsv(), isOfferCode(), mergeCatalog(), authorize(), banBodySchema, hostFromRequest() (+173 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (85): shouldEnqueueEmbedLink(), app, CONFIG_KEYS, repo(), repo(), repo(), linksRepo(), linksRepo() (+77 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (103): Page(), PRODUCT, Refund, Page(), Page(), CaseRow, ModerationQueue(), decide() (+95 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (107): OpenAiEmbeddingService, OpenAiEmbeddingsResponse, cities, cityById(), discoveryLanguages, DiscoveryMetadata, discoverySql(), exactCity() (+99 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (73): Page(), Page(), Page(), Page(), Page(), ColorPicker(), ColorPickerProps, palette (+65 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (74): FacetEditor(), FacetKind, FacetLists, FacetRow, FacetSummaries(), lengthHint(), searchLabel(), centsFrom() (+66 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (71): Card, Facet, Page(), rowHref(), SearchBody, SearchContext(), SearchResults(), answer() (+63 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (78): count(), duration(), Fees, Filters, Finance, FinancePanel(), load(), saveFees() (+70 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (63): metadata, Page(), metadata, Page(), Page(), ButtonLink(), MediaKitPreview(), CampaignPublic (+55 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (70): prisma, ModerationOutcome, AiApprovalEvidence, aiApprovalSnapshot(), actionReference(), contextInfoSchema, envelope, matchesReference() (+62 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (29): PaymentMethod, CatalogOffer, DEFAULTS, OFFER_CODES, OfferCode, OfferDraft, SURFACES, CODE_BY_KEY (+21 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (52): Page(), resolve(), onSubmit(), metadata, Page(), Account(), removeAccount(), Page() (+44 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (77): ChannelBinding, ChannelDestination, ChannelGroupEdit, ChannelGroupSummary, channelNetwork, ChannelSettings, mergeChannelGroup(), projectChannelGroups() (+69 more)

### Community 13 - "Community 13"
Cohesion: 0.04
Nodes (55): prisma, observeServerError(), DeliveryUnavailableError, env, optionalText, optionalUrl, parsed, schema (+47 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (52): FormSteps(), assistantRequest(), AssistantRequestError, assistantApplyBody(), AssistantChoice, AssistantField, AssistantInput, AssistantList (+44 more)

### Community 15 - "Community 15"
Cohesion: 0.05
Nodes (59): appearanceInput, ProfileAppearance, appearance, campaignContent(), campaignCreateInput, campaignIsPublished(), campaignUpdateInput, selection (+51 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (55): hitsBlocklist(), ContentReviewRequired, reviewSummary(), DestinationPoolInput, selectWeighted(), rows, createRedirectInput, DestinationInput (+47 more)

### Community 17 - "Community 17"
Cohesion: 0.04
Nodes (46): metadata, Page(), metadata, metadata, metadata, metadata, Page(), metadata (+38 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (41): ctr(), AnalyticsOrigin, ORIGINS, payload(), readSurface(), signSurface(), surfaceKey(), Context (+33 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (44): target, SAFE_FETCH_MAX_BODY_BYTES, dynamic, generateMetadata(), load, Page(), AdvertisePage(), dynamic (+36 more)

### Community 20 - "Community 20"
Cohesion: 0.06
Nodes (52): forgetRefreshJti(), isRefreshRevoked(), redis(), refreshTtlSeconds(), resetRefreshRevocationsForTest(), revokeRefreshJti(), readOutbound(), banReasonOf() (+44 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (37): Page(), WorkspaceActions(), OverlayDialog(), ContentReview, downloadQr(), QrDialog(), CreatePoolInvite(), DestinationPool (+29 more)

### Community 22 - "Community 22"
Cohesion: 0.05
Nodes (30): api, row, api, api, traffic, row, { api, push }, suggestions (+22 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (55): optional, parseTouch(), required, good, touchSchema, chargeGateway(), checkoutBody, checkoutStore() (+47 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (43): claimCharge(), redis(), releaseCharge(), AVAILABILITY_QUEUE_NAME, enqueueAvailabilityCycle(), EmbedLinkJobPayload, enqueueEmbedLink(), getEmbedLinkJobsForTest() (+35 more)

### Community 25 - "Community 25"
Cohesion: 0.08
Nodes (22): BullRefundScheduler, JobQueue, moveOrder(), isPixLate(), Order, ORDER_STATUSES, OrderStatus, PaymentGateway (+14 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (13): eventShape, referenceId, stamp(), StripeBillingGateway, BillingCheckoutSnapshot, BillingEventReference, BillingGateway, BillingPrice (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (31): state, fixtures(), Kind, login(), decodeQrDownload(), fixture(), login(), origin (+23 more)

### Community 28 - "Community 28"
Cohesion: 0.07
Nodes (39): Choice, Consent(), choose(), review(), COOKIE_REVIEW, countChoice(), installPixel(), PixelQueue (+31 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (43): OpenAiProfileSuggestion, schema, input, output, ImportChoice, ImportLine, planProfileImport(), previewProfileImport() (+35 more)

### Community 30 - "Community 30"
Cohesion: 0.10
Nodes (47): billingCheckoutInput, BillingError, billingExpectedVersion, billingPlanInput, billingRequestKey, billingSettingsInput, BASE_PROFILE_CAPABILITIES, billingReturnPath() (+39 more)

### Community 31 - "Community 31"
Cohesion: 0.07
Nodes (37): avatarPng(), chunk(), crc(), signature, escapeText(), EventBlock, eventCalendar(), eventState() (+29 more)

### Community 32 - "Community 32"
Cohesion: 0.07
Nodes (43): canMeasureProfile(), InteractionBlock, InteractionEvent, InteractionFacts, interactionIdentity(), InteractionSummary, PROFILE_INTERACTION_MIN_SAMPLE, PROFILE_INTERACTION_RETENTION_DAYS (+35 more)

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (30): Loading(), Loading(), Loading(), Loading(), Skeleton(), SkeletonButton(), SkeletonField(), SkeletonRegion() (+22 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (31): dynamic, invalidSearch(), Page(), Page(), metadata, Page(), ProfilePreviewSkeleton(), ProfileAgeGate() (+23 more)

### Community 35 - "Community 35"
Cohesion: 0.08
Nodes (31): decideReport(), intakeReport(), kinds, REPORT_DAILY_LIMIT, REPORT_WINDOW_MS, ReportError, reportKind(), reportReason (+23 more)

### Community 36 - "Community 36"
Cohesion: 0.08
Nodes (34): DELETE, GET, handle(), PATCH, POST, PUT, mockedForward, metadata (+26 more)

### Community 37 - "Community 37"
Cohesion: 0.07
Nodes (31): composeBillingE2e(), channelFixtures, embed(), DELIVERED_PROFILE_CAPABILITIES, setProfileInteractionsForTest(), client, db, headers() (+23 more)

### Community 38 - "Community 38"
Cohesion: 0.09
Nodes (41): composeProfileHostsE2e(), assertCloudflareHostAvailable(), get(), records, bases, provider, unavailable(), application (+33 more)

### Community 39 - "Community 39"
Cohesion: 0.09
Nodes (28): ChatResponse, ModerationProviderError, OpenAiTextModeration, parseVerdict(), TEXT, collectionName(), FavoritesError, favoriteView() (+20 more)

### Community 40 - "Community 40"
Cohesion: 0.06
Nodes (31): signWooviTestBody(), WOOVI_TEST_PUBLIC_KEY, isWooviRegistrationPing(), PAYMENT_KEYS, verifyWooviSignature(), WOOVI_PUBLISHED_PUBLIC_KEY, add(), enqueueChargeOrder() (+23 more)

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (41): probeAvailability(), defaultPinnedConnect(), enqueueTextProposal(), discoveryFields, cleanSummary(), documentTitle(), facetBlurb(), facetIndexable() (+33 more)

### Community 42 - "Community 42"
Cohesion: 0.09
Nodes (24): Page(), CLASS, Variant, Checkbox(), FileUpload(), FileUploadProps, ImageUpload(), ImageUploadProps (+16 more)

### Community 43 - "Community 43"
Cohesion: 0.08
Nodes (37): attemptKey(), Catalog, Charge, CheckoutPage(), check(), chooseDays(), choosePlan(), pay() (+29 more)

### Community 44 - "Community 44"
Cohesion: 0.09
Nodes (32): Badge(), Kind, Mark(), Tone, AdminContent(), AdminPlan, BillingAdmin(), retry() (+24 more)

### Community 45 - "Community 45"
Cohesion: 0.08
Nodes (36): dateOf(), DatePicker(), commit(), move(), navigate(), reset(), select(), DatePickerProps (+28 more)

### Community 46 - "Community 46"
Cohesion: 0.10
Nodes (22): monitorPolicy, hostMatchesNetwork(), availabilityRoutes(), actor(), getLinkAvailabilityRepository(), historySelect, lockedLink(), PrismaLinkAvailabilityRepository (+14 more)

### Community 47 - "Community 47"
Cohesion: 0.09
Nodes (29): canonicalUrl(), buildProfileChecklist(), ChecklistFacts, ChecklistState, ChecklistStep, ProfileChecklist, block, group (+21 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (35): fetchOwnershipFile(), OwnershipFetch, assertPublicHttps(), assertResolvedAddresses(), DnsResolver, isPrivate(), isPrivateIPv4(), mappedIPv4() (+27 more)

### Community 49 - "Community 49"
Cohesion: 0.07
Nodes (33): checklist(), create(), fixture(), login(), origin, profileEditorTool(), routes, fixture() (+25 more)

### Community 50 - "Community 50"
Cohesion: 0.08
Nodes (34): Layout(), metadata, Layout(), metadata, Page(), Page(), amount(), ConfirmedToast() (+26 more)

### Community 51 - "Community 51"
Cohesion: 0.09
Nodes (33): dueForRenewal(), RENEWAL_LEAD_MS, renewalReminderPolicy(), renewalWindowKey(), now, row, setRenewalReminderDbForTest(), actor() (+25 more)

### Community 52 - "Community 52"
Cohesion: 0.09
Nodes (21): Page(), OverlayDialogProps, Pagination(), emptyMediaContent(), MediaContent, MediaState, MediaKitEditor(), Props (+13 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (29): apiPath(), dynamic, generateMetadata(), NicheBody, Page(), dynamic, generateMetadata, Page() (+21 more)

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (29): canWorkspace(), level, permissionSections, publicWorkspaceAction(), workspaceGrants, workspaceRoute(), WorkspaceSection, setOwnershipFetchForTest() (+21 more)

### Community 55 - "Community 55"
Cohesion: 0.10
Nodes (31): DIGEST_INTERVAL_MS, DigestLink, selectDigestLinks(), preferences, row, setNicheFollowsDbForTest(), a(), cycle() (+23 more)

### Community 56 - "Community 56"
Cohesion: 0.09
Nodes (28): sql(), command(), cycle(), fixture(), legacyReference(), payload(), reviewReference(), state (+20 more)

### Community 57 - "Community 57"
Cohesion: 0.14
Nodes (33): invitationAvailable(), invitationToken(), permits(), ProfileActor, profilePermission, ProfileRole, recipientDigest(), tokenDigest() (+25 more)

### Community 58 - "Community 58"
Cohesion: 0.15
Nodes (32): activate(), clock(), db, event(), startCheckout(), profileBillingDb(), BILLING_OPEN_STATES, BillingActor (+24 more)

### Community 59 - "Community 59"
Cohesion: 0.08
Nodes (21): Loading(), Loading(), Loading(), Loading(), Loading(), Loading(), Loading(), Loading() (+13 more)

### Community 60 - "Community 60"
Cohesion: 0.11
Nodes (25): codes, confirmationInboxEnabled(), readConfirmation(), resetConfirmationInboxForTest(), stashConfirmation(), ConfirmationProvider, confirmationProviders, defaultConfirmationDelivery() (+17 more)

### Community 61 - "Community 61"
Cohesion: 0.07
Nodes (21): assertPortsFree(), backend, globalSetup(), listening(), run(), globalTeardown(), killTree(), assert (+13 more)

### Community 62 - "Community 62"
Cohesion: 0.06
Nodes (30): billingStub(), calls, customers, idempotency, invoices, paidInvoice(), price(), schedules (+22 more)

### Community 63 - "Community 63"
Cohesion: 0.19
Nodes (21): capturePage(), definition, create(), prepare(), prepare(), editor(), fill(), control (+13 more)

### Community 64 - "Community 64"
Cohesion: 0.10
Nodes (21): redis, enqueueAnalyticsPurge(), getAnalyticsPurgeJobsForTest(), getQueue(), resetAnalyticsPurgeJobsForTest(), testJobs, store(), dayKey() (+13 more)

### Community 65 - "Community 65"
Cohesion: 0.11
Nodes (32): "profile_billing_accounts", profile_billing_accounts_id_tenantId_ownerId_key, profile_billing_accounts_providerCustomerId_key, profile_billing_accounts_tenantId_ownerId_key, "profile_billing_events", profile_billing_events_state_nextAttemptAt_idx, profile_billing_events_tenantId_receivedAt_idx, "profile_billing_operations" (+24 more)

### Community 66 - "Community 66"
Cohesion: 0.14
Nodes (22): contactRequest(), ContactDefinition, contactFields, ContactFormDescriptor, ContactSettings, ContactSubmission, contactTitles, defaultContact (+14 more)

### Community 67 - "Community 67"
Cohesion: 0.09
Nodes (17): notifyPasswordReset(), publicResetUrl(), hashResetToken(), memoryAccounts, MemoryPasswordAccounts, MemoryPasswordResetStore, memoryStore, PASSWORD_RESET_TTL_SECONDS (+9 more)

### Community 68 - "Community 68"
Cohesion: 0.08
Nodes (4): InMemoryModerationCasesRepository, ModerationCasesRepository, PrismaModerationCasesRepository, toCaseRecord()

### Community 69 - "Community 69"
Cohesion: 0.10
Nodes (28): "users", users_tenantId_idx, collection_items, collection_items_favorite_idx, collections, collections_owner_page_idx, favorites, favorites_owner_page_idx (+20 more)

### Community 70 - "Community 70"
Cohesion: 0.12
Nodes (21): seedPerformance(), analyticsDayStart(), allocateSurfaceCents(), performanceRange(), performanceTotals(), proratedCents(), validDay(), activeServiceWindows() (+13 more)

### Community 71 - "Community 71"
Cohesion: 0.15
Nodes (22): emailBrand, siteOrigin(), brandOf(), configuredResend(), deliverEmail(), emailOutboxEnabled(), notifyAccountDeleted(), notifyBan() (+14 more)

### Community 72 - "Community 72"
Cohesion: 0.09
Nodes (22): AdminNav(), NavigationDestination, navigationIcons, SidebarLink(), SiteNavigation(), sync(), { pathname, workspaceAccess }, iconPaths (+14 more)

### Community 73 - "Community 73"
Cohesion: 0.12
Nodes (26): create(), fixture(), login(), mutate(), origin, seed(), configure(), fixture() (+18 more)

### Community 74 - "Community 74"
Cohesion: 0.11
Nodes (16): create(), retrieve(), StripeCardPaymentGateway, StripeGatewayClient, WooviChargeResponse, WooviPixPaymentGateway, WooviRefundResponse, CardCharge (+8 more)

### Community 75 - "Community 75"
Cohesion: 0.16
Nodes (22): measurementTrafficAllowed(), canObserveSearch(), hasSearchSample(), normalizedSearchTerm(), SEARCH_DAILY_LIMIT, SEARCH_RETENTION_DAYS, SEARCH_SAMPLE_THRESHOLD, searchSessionKey() (+14 more)

### Community 76 - "Community 76"
Cohesion: 0.12
Nodes (22): DYNAMIC, pathTemplate(), STATIC, utmToken(), analyticsSession(), attempts, consentBody, limited() (+14 more)

### Community 77 - "Community 77"
Cohesion: 0.16
Nodes (26): emptyMediaKit(), manualMediaMetric(), manualMetric, measuredMediaMetric(), MediaKitContent, mediaPublicFields, mediaSelection, validateMediaDates() (+18 more)

### Community 78 - "Community 78"
Cohesion: 0.15
Nodes (15): SettingsEditor(), Page(), EvolutionIntegrationSkeleton(), WorkspaceSection(), ActionSkeleton(), DashboardSkeleton(), DashboardSummarySkeleton(), FiltersSkeleton() (+7 more)

### Community 79 - "Community 79"
Cohesion: 0.13
Nodes (19): Page(), Page(), ReportCard(), ReportDecisionInput, ReportForm(), REPORT_REASONS, REPORT_STATUS, ReportFormProps (+11 more)

### Community 80 - "Community 80"
Cohesion: 0.17
Nodes (20): formatRate(), fullDate(), PerformanceCharts(), surfaces, day(), number(), PerformanceCharts, PerformanceDetails() (+12 more)

### Community 81 - "Community 81"
Cohesion: 0.10
Nodes (24): BUCKETS, BuyerSummary, CONTRACT_FEES, feeCents(), filterRows(), FinanceFees, FinanceFilters, FinanceMethod (+16 more)

### Community 82 - "Community 82"
Cohesion: 0.14
Nodes (25): ContactDefinition, contactFields, contactTitles, csvCell(), defaultContact, parseAnswers(), definition, Db (+17 more)

### Community 83 - "Community 83"
Cohesion: 0.12
Nodes (21): fixture(), login(), mutate(), origin, refuse(), seed(), browse(), clearFilters() (+13 more)

### Community 84 - "Community 84"
Cohesion: 0.10
Nodes (17): nextConfig, paramsFrom(), POST(), contentType, size, dynamic, metadata, Page() (+9 more)

### Community 85 - "Community 85"
Cohesion: 0.11
Nodes (23): fillMissingFacetSummaries(), OpenRow, writeMissing(), INITIAL_CONFIG, main(), prisma, toPromotionProductCode(), main() (+15 more)

### Community 86 - "Community 86"
Cohesion: 0.12
Nodes (22): profile_assets, profile_categories, profile_items, profiles, profile_revisions, profile_revisions_immutable, profile_revisions_owner_version_idx, profile_revisions_version_key (+14 more)

### Community 87 - "Community 87"
Cohesion: 0.12
Nodes (24): Page(), Page(), descriptionOf(), FilterId, FILTERS, formatNumber(), GLYPH, LinkEditor() (+16 more)

### Community 88 - "Community 88"
Cohesion: 0.13
Nodes (23): ensure_redirect_active_approved(), redirect_daily, redirect_daily_retention_idx, redirect_destinations, redirect_destinations_retention_idx, redirect_handles, redirect_handles_active_approved, redirect_handles_owner_page_idx (+15 more)

### Community 89 - "Community 89"
Cohesion: 0.21
Nodes (19): main(), main(), analyticsDay(), shiftAnalyticsDay(), planGrowthTraffic(), planTraffic(), random(), SimulatedVisit (+11 more)

### Community 90 - "Community 90"
Cohesion: 0.23
Nodes (23): action(), codeBlock(), detail(), EmailBlock, EmailDocument, escapeHtml(), headerLogo(), logoTag() (+15 more)

### Community 91 - "Community 91"
Cohesion: 0.11
Nodes (18): ConfirmationDelivery, assertGuessAllowed(), assertResendAllowed(), ConfirmCrypto, ConfirmInput, ConfirmResult, ConfirmUser, countResends() (+10 more)

### Community 92 - "Community 92"
Cohesion: 0.10
Nodes (17): api, report, api, fillAndSend(), push, trackGoogleAdsLinkSubmission, context, mockApi (+9 more)

### Community 93 - "Community 93"
Cohesion: 0.15
Nodes (19): FacetBadge(), FacetIcon(), Glyph(), iconColor(), TitleMark(), allMarks(), channel(), contrast() (+11 more)

### Community 94 - "Community 94"
Cohesion: 0.13
Nodes (23): "tenants", tenants_host_key, "user_identifiers", user_identifiers_tenantId_kind_normalizedValue_key, user_identifiers_userId_idx, "verification_codes", verification_codes_userId_kind_createdAt_idx, verification_codes_userIdentifierId_createdAt_idx (+15 more)

### Community 95 - "Community 95"
Cohesion: 0.13
Nodes (19): loadCandidates(), autocompleteIds(), escapeLikePrefix(), exclusiveOf(), FACET_ACCENTS, FACET_PLAIN, facetKeys(), facetMatchesProbe() (+11 more)

### Community 96 - "Community 96"
Cohesion: 0.14
Nodes (5): acquireRunLease(), defaultFile, fs, path, @playwright/test

### Community 97 - "Community 97"
Cohesion: 0.13
Nodes (17): dynamic, metadata, Page(), AgePrompt(), AgeWall(), confirmAge(), readAge(), Choice (+9 more)

### Community 98 - "Community 98"
Cohesion: 0.13
Nodes (22): assertLocalDatabase(), DemoUser, embedPublished(), ensureAnalytics(), ensureCase(), ensureJob(), ensureLink(), ensureOrder() (+14 more)

### Community 99 - "Community 99"
Cohesion: 0.13
Nodes (19): compare(), db, explain(), main(), Query, rank(), Row, seed() (+11 more)

### Community 100 - "Community 100"
Cohesion: 0.12
Nodes (16): asBia(), Call, contextOn(), login(), state, getRaw(), postRaw(), promoteJob() (+8 more)

### Community 101 - "Community 101"
Cohesion: 0.14
Nodes (20): call(), cleanup(), ids, kill(), main(), prisma, seed(), stub (+12 more)

### Community 102 - "Community 102"
Cohesion: 0.14
Nodes (11): resetOutboundForTest(), accountDeletionRepository, deleteAccount(), DeletionAccount, MemoryAccountDeletionRepository, memoryDeletion, PrismaAccountDeletionRepository, resetAccountDeletionForTest() (+3 more)

### Community 103 - "Community 103"
Cohesion: 0.17
Nodes (17): LinkEmbedSnapshot, buildLinkEmbeddingText(), EMBEDDING_DIMENSIONS, embedLink(), EMBEDDING_MAX_ATTEMPTS, EmbeddingIntent, EmbeddingIntentStatus, intents (+9 more)

### Community 104 - "Community 104"
Cohesion: 0.13
Nodes (17): PROFILE_HISTORY_DAYS, PROFILE_HISTORY_LIMIT, restoreProfileContent(), retainedProfileRevisions(), Revision, now, call(), db (+9 more)

### Community 105 - "Community 105"
Cohesion: 0.17
Nodes (14): OrderGrid(), PanelOrder, MetricChartProps, MetricChartRenderer(), Renderer, formatWhen(), LINK_STATUS, ORDER_STATUS (+6 more)

### Community 106 - "Community 106"
Cohesion: 0.11
Nodes (3): PrismaLinksRepository, substantiveLinkFilter(), toLinkRecord()

### Community 107 - "Community 107"
Cohesion: 0.09
Nodes (20): eslint, @eslint/js, @types/node, typescript, typescript-eslint, vitest, name, overrides (+12 more)

### Community 108 - "Community 108"
Cohesion: 0.16
Nodes (13): ProfileError(), Loading(), ManualMetric, MediaSelection, metricLabels, platforms, PublicMediaKit, MediaKitPending() (+5 more)

### Community 109 - "Community 109"
Cohesion: 0.21
Nodes (14): Loading(), confirmImport(), previewImport(), ImportChoice, ImportEntry, ImportLine, ImportPreview, ImportResult (+6 more)

### Community 110 - "Community 110"
Cohesion: 0.17
Nodes (14): FacetFilters(), FacetItem, HomeExplore(), ResizeObserverStub, EXPLORE_MILD_NICHES, EXPLORE_NETWORK_SECOND, exploreNetworks(), exploreNiches() (+6 more)

### Community 111 - "Community 111"
Cohesion: 0.19
Nodes (11): parsePixExpiration(), PIX_EXPIRATION_MIN_SECONDS, PIX_EXPIRES_IN_SECONDS, PixExpirationConfigError, pixExpiresInSeconds(), assertCheckout(), priceFor(), ExpirePixOrderUseCase (+3 more)

### Community 112 - "Community 112"
Cohesion: 0.19
Nodes (13): Page(), readShareKitState(), buildShareKitPlan(), ShareKitOptions, defaults, key(), ShareKitScreen(), download() (+5 more)

### Community 113 - "Community 113"
Cohesion: 0.10
Nodes (18): eslint, @eslint/js, @types/node, typescript, typescript-eslint, vitest, name, prisma (+10 more)

### Community 114 - "Community 114"
Cohesion: 0.10
Nodes (20): scripts, build, db:demo, db:deploy, db:generate, db:migrate, db:pull, db:push (+12 more)

### Community 115 - "Community 115"
Cohesion: 0.14
Nodes (13): fetchMock, call(), db, judge, preview(), probe, input, ProfileImportTicket (+5 more)

### Community 116 - "Community 116"
Cohesion: 0.14
Nodes (13): call(), csrf, enter(), fixture, db, id, supportDatabaseUrl(), supportReadContext (+5 more)

### Community 118 - "Community 118"
Cohesion: 0.18
Nodes (10): ChannelChoices(), ChannelLink(), channel, PublicChannel, EventCard(), Item, EventBlock, eventStatus() (+2 more)

### Community 119 - "Community 119"
Cohesion: 0.16
Nodes (15): "embedding_jobs", embedding_jobs_linkId_idx, embedding_jobs_status_nextAttemptAt_idx, "promotions", promotions_one_active_surface, promotions_tenantId_linkId_status_idx, links_tenantId_status_id_idx, promotions_surface_status_activatedAt_idx (+7 more)

### Community 120 - "Community 120"
Cohesion: 0.16
Nodes (12): A, cycle(), fixture(), login(), probe(), state(), A, fixture() (+4 more)

### Community 121 - "Community 121"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 122 - "Community 122"
Cohesion: 0.18
Nodes (5): Touch, AcquisitionStore, isUnique(), MemoryAcquisitionStore, PrismaAcquisitionStore

### Community 123 - "Community 123"
Cohesion: 0.18
Nodes (15): setAvailabilityProbeForTest(), base, create(), ctx(), db, decisionInput(), headers(), observe() (+7 more)

### Community 124 - "Community 124"
Cohesion: 0.14
Nodes (4): MemoryOrderInsightsRepository, OrderInsightsRepository, PrismaOrderInsightsRepository, MetaContext

### Community 125 - "Community 125"
Cohesion: 0.21
Nodes (13): generate(), generateQr(), QrArtifact, target, download(), artifact(), {generate,download}, target (+5 more)

### Community 126 - "Community 126"
Cohesion: 0.11
Nodes (18): devDependencies, @axe-core/playwright, eslint, @eslint/js, jsdom, jsqr, @playwright/test, storybook (+10 more)

### Community 127 - "Community 127"
Cohesion: 0.26
Nodes (13): PermissionEditor(), PermissionEditorProps, PermissionSummary(), sections, matchedPermissionProfile(), permissionGroupIcon(), permissionProfile, permissionProfiles() (+5 more)

### Community 128 - "Community 128"
Cohesion: 0.18
Nodes (13): "blocklist_terms", blocklist_terms_tenantId_idx, "links", links_tenantId_ownerId_status_idx, links_embedding_hnsw_idx, "link_reports", link_reports_dedup_idx, link_reports_tenantId_createdAt_id_idx (+5 more)

### Community 129 - "Community 129"
Cohesion: 0.20
Nodes (15): "order_events", order_events_orderId_eventId_key, "order_surfaces", order_surfaces_one_pending, order_surfaces_orderId_idx, "orders", orders_tenantId_linkId_status_idx, orders_tenantId_userId_idempotencyKey_key (+7 more)

### Community 130 - "Community 130"
Cohesion: 0.15
Nodes (4): emailFixture(), InMemoryConfirmCodesRepository, StoredCode, StoredIdentifier

### Community 131 - "Community 131"
Cohesion: 0.30
Nodes (3): ConfirmIdentifierUseCase, currentIdentifier(), resendRetryAfter()

### Community 132 - "Community 132"
Cohesion: 0.16
Nodes (8): fixture(), login(), origin, refuse(), fixture(), login(), origin, reset()

### Community 133 - "Community 133"
Cohesion: 0.13
Nodes (15): dependencies, bcryptjs, bullmq, dotenv, fastify, @fastify/cookie, @fastify/jwt, @hyperdx/node-opentelemetry (+7 more)

### Community 134 - "Community 134"
Cohesion: 0.19
Nodes (13): call(), db, group(), invite(), judge, live(), now, ports (+5 more)

### Community 135 - "Community 135"
Cohesion: 0.27
Nodes (10): metadata, Page(), metadata, Page(), LegalArticle(), flat(), legalDocument, legalPages() (+2 more)

### Community 136 - "Community 136"
Cohesion: 0.24
Nodes (13): availability_hosts, link_availability, link_availability_linkId_tenantId_key, link_availability_nextCheckAt_linkId_idx, link_availability_tenantId_disabledAt_idx, promotion_pauses, promotion_pauses_one_open, promotion_pauses_promotionId_revision_key (+5 more)

### Community 137 - "Community 137"
Cohesion: 0.26
Nodes (12): call(), content(), create(), db, judge, measurement(), path(), probe (+4 more)

### Community 138 - "Community 138"
Cohesion: 0.14
Nodes (13): compilerOptions, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, paths (+5 more)

### Community 139 - "Community 139"
Cohesion: 0.20
Nodes (7): A, base(), editorSection(), fixture(), login(), state(), step()

### Community 140 - "Community 140"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, isolatedModules, lib, module, moduleResolution, noEmit, resolveJsonModule (+5 more)

### Community 141 - "Community 141"
Cohesion: 0.26
Nodes (11): drawText(), image(), layout(), renderShareKit(), ShareKitArtifact, fitShareTitle(), ShareKitPlan, content (+3 more)

### Community 142 - "Community 142"
Cohesion: 0.23
Nodes (5): avatarContentType(), avatarWebp(), PrismaProfileMedia, ProfileMedia, sharp

### Community 143 - "Community 143"
Cohesion: 0.17
Nodes (11): db, end, events(), from, get(), start, to, today (+3 more)

### Community 144 - "Community 144"
Cohesion: 0.23
Nodes (10): call(), db, get(), grants, inviteWorkspace(), join(), judge, probe (+2 more)

### Community 145 - "Community 145"
Cohesion: 0.15
Nodes (3): MemorySiteTrafficRepository, PrismaSiteTrafficRepository, SiteTrafficRepository

### Community 146 - "Community 146"
Cohesion: 0.22
Nodes (6): notices, ordersForJobs(), runExpirePix(), runNotifyRefundFailed(), runtimeCheckoutStore(), StoreOrdersRepository

### Community 147 - "Community 147"
Cohesion: 0.24
Nodes (10): canonical(), main(), Row, series(), db, explain(), main(), Plan (+2 more)

### Community 148 - "Community 148"
Cohesion: 0.27
Nodes (9): seedAvailability(), seedReports(), CONFIG, link(), main(), passwordHash, prisma, tenantBundle() (+1 more)

### Community 149 - "Community 149"
Cohesion: 0.23
Nodes (9): call(), db, definition, judge, prepare(), probe, save(), submit() (+1 more)

### Community 150 - "Community 150"
Cohesion: 0.24
Nodes (9): setContentReviewsForTest(), apply(), call(), content(), db, initial(), judge, probe (+1 more)

### Community 151 - "Community 151"
Cohesion: 0.23
Nodes (9): setSuggestionsForTest(), call(), db, generate, judge, prepare(), probe, save() (+1 more)

### Community 152 - "Community 152"
Cohesion: 0.26
Nodes (9): call(), configure(), db, judge, probe, publicKit(), publish(), save() (+1 more)

### Community 153 - "Community 153"
Cohesion: 0.23
Nodes (8): action(), call(), db, get(), judge, probe, publish(), save()

### Community 154 - "Community 154"
Cohesion: 0.18
Nodes (3): mapCode(), mapIdentifier(), PrismaConfirmCodesRepository

### Community 155 - "Community 155"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, @eslint/js, tsup, tsx, @types/bcryptjs, @types/node, typescript (+3 more)

### Community 156 - "Community 156"
Cohesion: 0.27
Nodes (9): "evolution_operators", evolution_operators_tenantId_phone_key, "evolution_receipts", evolution_receipts_instance_providerMessageId_key, evolution_receipts_state_createdAt_idx, "operational_messages", operational_messages_kind_resourceId_idx, operational_messages_tenantId_state_nextAttemptAt_idx (+1 more)

### Community 157 - "Community 157"
Cohesion: 0.25
Nodes (8): accept(), call(), db, invite(), judge, probe, save(), shared()

### Community 158 - "Community 158"
Cohesion: 0.31
Nodes (8): fixture(), login(), mutate(), origin, prepare(), publish(), refuse(), seededGroup()

### Community 159 - "Community 159"
Cohesion: 0.18
Nodes (11): scripts, build, build:storybook, dev, lint, start, storybook, test (+3 more)

### Community 160 - "Community 160"
Cohesion: 0.18
Nodes (7): Example(), Interactive, meta, Story, config, preview, @storybook/nextjs-vite

### Community 161 - "Community 161"
Cohesion: 0.16
Nodes (7): moveProfileItem(), {request,preview,confirm}, result, state, TeamState, data, {request}

### Community 162 - "Community 162"
Cohesion: 0.24
Nodes (6): "analytics_events", analytics_events_sessionId_linkId_surface_day_kind_key, analytics_events_tenantId_day_idx, analytics_events_tenantId_linkId_day_idx, analytics_events_tenantId_linkId_createdAt_idx, analytics_events_tenantId_type_simulationId_id_idx

### Community 163 - "Community 163"
Cohesion: 0.24
Nodes (7): media_kit_configs, media_kit_configs_identity_key, profile_host_names, profile_hosts, profile_hosts_one_active_key, profile_hosts_one_pending_key, profile_hosts_profile_idx

### Community 164 - "Community 164"
Cohesion: 0.31
Nodes (6): setCollectionsPortsForTest(), call(), collection(), db, favorite(), ready()

### Community 166 - "Community 166"
Cohesion: 0.24
Nodes (7): call(), confirmEmail(), Mail, outbox(), serial, state, userId()

### Community 167 - "Community 167"
Cohesion: 0.27
Nodes (5): A, fill(), fixture(), login(), state()

### Community 168 - "Community 168"
Cohesion: 0.20
Nodes (10): dependencies, @base-ui/react, next, qrcode, react, react-dom, react-is, recharts (+2 more)

### Community 169 - "Community 169"
Cohesion: 0.22
Nodes (9): allowScripts, esbuild@0.25.12, esbuild@0.27.2, esbuild@0.28.2, msgpackr-extract@3.0.4, prisma@6.0.1, @prisma/client@6.0.1, @prisma/engines@6.0.1 (+1 more)

### Community 170 - "Community 170"
Cohesion: 0.22
Nodes (9): overrides, @opentelemetry/context-async-hooks, @opentelemetry/core, @opentelemetry/propagator-b3, @opentelemetry/propagator-jaeger, @opentelemetry/resources, @opentelemetry/sdk-metrics, @opentelemetry/sdk-trace-base (+1 more)

### Community 171 - "Community 171"
Cohesion: 0.22
Nodes (4): hits, main(), sink, @hyperdx/node-opentelemetry

### Community 172 - "Community 172"
Cohesion: 0.28
Nodes (6): call(), db, get(), judge, probe, save()

### Community 173 - "Community 173"
Cohesion: 0.44
Nodes (5): hyperdxServiceName(), isActuatorProbe(), redisStatement(), shouldRegisterHyperDX(), require

### Community 174 - "Community 174"
Cohesion: 0.36
Nodes (5): anonymizeAccount(), BAN_AFTER_DELETION, IDENTITY_KEYS, stripIdentity(), preRefuse()

### Community 175 - "Community 175"
Cohesion: 0.50
Nodes (7): contact_form_revisions, contact_forms, contact_rate_buckets, contact_rate_expiry_idx, contact_submissions, contact_submissions_expiry_idx, contact_submissions_page_idx

### Community 176 - "Community 176"
Cohesion: 0.36
Nodes (5): CodeBoxes(), apply(), commit(), onKeyDown(), Harness()

### Community 177 - "Community 177"
Cohesion: 0.38
Nodes (5): "moderation_cases", moderation_cases_linkId_key, moderation_cases_tenantId_idx, moderation_cases_linkId_closedAt_idx, moderation_cases_one_open_per_link

### Community 178 - "Community 178"
Cohesion: 0.48
Nodes (6): "acquisition_touches", acquisition_touches_tenantId_campaign_idx, acquisition_touches_userId_key, "funnel_events", funnel_events_tenantId_eventId_key, funnel_events_tenantId_name_createdAt_idx

### Community 179 - "Community 179"
Cohesion: 0.33
Nodes (5): AvailabilityState, observeAvailability(), now, policy, fields()

### Community 180 - "Community 180"
Cohesion: 0.38
Nodes (5): setFavoritesDbForTest(), call(), collection(), db, favorite()

### Community 181 - "Community 181"
Cohesion: 0.29
Nodes (5): read(), {create,read}, content, {read,published}, state

### Community 182 - "Community 182"
Cohesion: 0.48
Nodes (4): metadata, Page(), accountLinks(), isSignedIn()

### Community 183 - "Community 183"
Cohesion: 0.38
Nodes (5): afterAuth(), panelGate(), banned, open, pending

### Community 184 - "Community 184"
Cohesion: 0.33
Nodes (5): ChecklistState, ChecklistStep, ProfileChecklist, fixture, {request,push}

### Community 185 - "Community 185"
Cohesion: 0.53
Nodes (5): "consent_daily", consent_daily_tenantId_day_choice_key, "site_traffic_daily", site_traffic_daily_tenantId_day_idx, site_traffic_daily_tenantId_day_path_source_medium_campaign_key

### Community 186 - "Community 186"
Cohesion: 0.33
Nodes (3): replies, Seen, server

### Community 187 - "Community 187"
Cohesion: 0.47
Nodes (3): Loading(), AdvertiseLanding(), AdvertiseLandingProps

### Community 188 - "Community 188"
Cohesion: 0.33
Nodes (5): { api }, initial, next, organic, sponsored

### Community 189 - "Community 189"
Cohesion: 0.70
Nodes (4): "search_observations", search_observations_tenantId_createdAt_idx, search_observations_tenantId_sessionKey_day_idx, search_observations_tenantId_sessionKey_day_term_outcome_key

### Community 190 - "Community 190"
Cohesion: 0.70
Nodes (3): canSubmitLink(), assertCanSubmitLink(), decideSubmission()

### Community 191 - "Community 191"
Cohesion: 0.40
Nodes (3): draft, { request }, revision

### Community 194 - "Community 194"
Cohesion: 0.83
Nodes (3): "promotion_offers", promotion_offers_tenantId_productCode_key, promotion_offers_tenantId_sortOrder_idx

### Community 196 - "Community 196"
Cohesion: 0.50
Nodes (3): @fastify/jwt, FastifyJWT, @fastify/jwt

### Community 197 - "Community 197"
Cohesion: 0.50
Nodes (3): { forward }, row, seo

### Community 198 - "Community 198"
Cohesion: 0.50
Nodes (3): pool, request, source

## Knowledge Gaps
- **23 isolated node(s):** `prisma`, `@eslint/js`, `@types/bcryptjs`, `@types/node`, `eslint` (+18 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1958 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `Community 9` to `Community 0`, `Community 1`, `Community 3`, `Community 134`, `Community 137`, `Community 10`, `Community 12`, `Community 13`, `Community 142`, `Community 15`, `Community 143`, `Community 144`, `Community 18`, `Community 147`, `Community 148`, `Community 149`, `Community 150`, `Community 151`, `Community 152`, `Community 153`, `Community 23`, `Community 20`, `Community 24`, `Community 157`, `Community 30`, `Community 29`, `Community 32`, `Community 35`, `Community 164`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 172`, `Community 46`, `Community 47`, `Community 48`, `Community 51`, `Community 180`, `Community 54`, `Community 55`, `Community 57`, `Community 58`, `Community 64`, `Community 70`, `Community 71`, `Community 75`, `Community 76`, `Community 77`, `Community 16`, `Community 82`, `Community 85`, `Community 89`, `Community 91`, `Community 98`, `Community 99`, `Community 101`, `Community 102`, `Community 104`, `Community 113`, `Community 115`, `Community 116`, `Community 123`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **What connects `prisma`, `@eslint/js`, `@types/bcryptjs` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.032978680037503566 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 42` to `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 11`, `Community 14`, `Community 19`, `Community 21`, `Community 28`, `Community 160`, `Community 33`, `Community 34`, `Community 36`, `Community 43`, `Community 44`, `Community 45`, `Community 176`, `Community 50`, `Community 52`, `Community 53`, `Community 61`, `Community 66`, `Community 72`, `Community 200`, `Community 78`, `Community 79`, `Community 80`, `Community 87`, `Community 92`, `Community 97`, `Community 107`, `Community 109`, `Community 110`, `Community 112`, `Community 118`, `Community 127`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.02187192118226601 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Community 84` to `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 135`, `Community 11`, `Community 17`, `Community 19`, `Community 28`, `Community 34`, `Community 36`, `Community 43`, `Community 50`, `Community 52`, `Community 53`, `Community 182`, `Community 59`, `Community 72`, `Community 78`, `Community 80`, `Community 87`, `Community 97`, `Community 105`, `Community 107`, `Community 118`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.029428364105458356 - nodes in this community are weakly interconnected._