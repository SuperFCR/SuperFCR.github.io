# Homepage analytics

Measurement version: `20260906`. Both locales use the same measurement ID and shared scripts.

## Event contract

All events carry `page_language` (`en` or `zh-CN`). The Google tag also receives this parameter before its first page view. `measurement_version` is a diagnostic parameter, not a registered reporting dimension.

| Event | Parameters | Trigger |
|---|---|---|
| contact_click | channel=email, link_position=header/bio | Mail link click; does not imply an email was sent |
| profile_link_click | channel=cv/scholar/github, link_position=header | Personal resource click; retained for historical comparisons |
| cv_click | channel=cv, link_position=header | CV link click, emitted once in code; never additionally derive it in GA Admin |
| language_switch | channel, from_language, to_language | Click to a different page language only |
| select_content | content_type=research_area, content_id, research_area | Explicitly select a research filter; IDs use `selected`, `all`, or a research area |
| select_content | content_type=paper_resource, content_id, research_area, resource_type, link_position=title/badge | Valid project resource click |
| project_impression | content_type=paper_resource, content_id, research_area | At least 50% of the project title visible continuously for 1 second while the tab is visible and the project is included by the active filter; once per project per page instance |
| section_view | section_id | At least 50% of the section heading visible continuously for 1 second in the foreground; once per section per page instance |

The project title is the visibility target so very tall mobile cards remain measurable. A title impression is a content exposure proxy, not proof of reading. Changing the visible research cards or groups, leaving the viewport or hiding the tab resets unfinished dwell. Filter changes request fresh visibility geometry because removing cards or groups can move other titles into view. Completed impressions remain deduplicated when switching filters and through back/forward cache restores. Selected is the default filter when JavaScript initializes; this initial selection does not emit a selection event. Without JavaScript, all papers remain readable.

Project `analyticsId` values live in `config/data.json`; preserve them when renaming or moving projects. The initial IDs match the previous title-derived IDs. The build rejects missing or duplicate IDs. A project without a resource link renders a non-clickable title.

## GA4 setup

Use built-in Content ID (`content_id`) and Content type (`content_type`). Retain the existing Click channel, Research area, Resource type custom dimensions. Add event-scoped dimensions for `page_language`, `link_position`, `section_id`, `from_language`, `to_language`.

Mark `contact_click` and `cv_click` as key events; use once-per-session key-event counting for intent reporting. Raw event counts still measure repeat clicks. Do not set arbitrary monetary values.

Do not add generic click, page_view, scroll or file_download handlers: enhanced measurement already supplies those. A single interaction may have an automatic event and a semantic custom event. Compare each event separately rather than summing them as unique interactions.

## Reports

1. Project resources: filter select_content + content_type=paper_resource; rows Content ID; columns Resource type; values Event count, Total users.
2. Profile links: filter profile_link_click; rows Click channel; values Event count, Total users.
3. Acquisition and intent: rows Session source / medium; values Sessions, Engaged sessions, Key events, Session key event rate; inspect contact_click and cv_click separately as needed.
4. Exposure: filter project_impression, rows Content ID; compare exposure users with resource-click users using matching scope. Raw click-count divided by exposure-user count is not CTR.

## QA

Localhost/file previews never load the Google tag. Their dataLayer remains available for isolated tests. On a production hostname, `?analytics_debug=1` opts only that page into GA DebugView; normal pages omit debug_mode entirely. Do not share the debug URL as an acquisition link.

Validate the built English and Chinese pages, first page_view language, meaningful clicks, filter selection and exposure, tab visibility, mobile layout and DebugView reception. When checking filters, confirm the default Selected view emits no selection event, hidden papers never emit impressions even within a visible group, switching before 1 second resets unfinished dwell, returning to a paper requires a fresh continuous second of visibility, and completed impressions do not repeat. New reporting dimensions normally require processing time before report data appears.

## Attribution links

Use channel/purpose tags only, never recipient names or emails. Place UTM links at external entry points, not internal navigation. The delivered setup guide contains ready-to-use URLs; existing CV PDFs and third-party profiles must be updated separately where appropriate.
