import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as talentApi from '../../api/talent.js';
import { useAuth } from '../../context/useAuth.js';
import { INDUSTRIES, EMPLOYMENT_TYPES, labelFor } from '../../constants/industries.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import OpenToWorkBadge from '../../components/talent/OpenToWorkBadge.jsx';
import Avatar from '../../components/talent/Avatar.jsx';
import ApprovalNotice from '../../components/company/ApprovalNotice.jsx';

/**
 * The candidate directory: every job seeker on the system, filtered by
 * industry, availability and kind of work.
 *
 * The page is reachable only by an admin or by the owner of an approved
 * company. That is enforced on the server; here it shows as the message
 * the server sends back, because an employer whose company is still
 * waiting for approval needs to be told that rather than shown an empty
 * list they will read as "there are no candidates".
 */
export default function TalentPage() {
  const { isAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [openToWorkOnly, setOpenToWorkOnly] = useState(false);
  // Admins can swap the directory over to employer accounts. The control
  // is not rendered for anybody else, and the server ignores the
  // parameter for them in any case.
  const [accountType, setAccountType] = useState('jobseeker');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // A 403 here is the approval gate rather than a failure, and it gets a
  // page of its own explaining the wait. Anything else is an ordinary
  // error and stays in the alert bar above the list.
  const [accessMessage, setAccessMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setAccessMessage('');

    try {
      const data = await talentApi.listTalent({
        page,
        search: search.trim() || undefined,
        industry: industry || undefined,
        employmentType: employmentType || undefined,
        openToWork: openToWorkOnly ? 'true' : undefined,
        accountType: isAdmin ? accountType : undefined,
      });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      if (err.response?.status === 403) {
        setAccessMessage(err.message);
      } else {
        setError(err.message);
      }
      setUsers([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, industry, employmentType, openToWorkOnly, accountType, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Applies a filter change and returns to page 1, because the page the
   * user is on may not exist in the newly filtered results.
   * @param {(value: string|boolean) => void} setter - The filter's setter.
   * @returns {(value: string|boolean) => void}
   */
  function changeFilter(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  const isEmployerList = isAdmin && accountType === 'employer';

  // The gate replaces the whole page: showing filters above a notice that
  // says the page cannot be read would invite the user to keep trying.
  if (accessMessage) {
    return (
      <ApprovalNotice
        message={accessMessage}
        detail="Candidate profiles are personal details, so only approved companies can see them."
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isEmployerList ? 'Employers' : 'Candidates'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isEmployerList
            ? 'Every employer account on the system.'
            : 'Job seekers on the system, with the CV each one has made primary.'}
        </p>
      </header>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="talent-search"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Search
          </label>
          <input
            id="talent-search"
            value={search}
            onChange={(e) => changeFilter(setSearch)(e.target.value)}
            placeholder="Name or position"
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="talent-industry"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Industry
          </label>
          <select
            id="talent-industry"
            value={industry}
            onChange={(e) => changeFilter(setIndustry)(e.target.value)}
            className="mt-1 rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          >
            <option value="">All industries</option>
            {INDUSTRIES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>

        {!isEmployerList && (
          <>
            <div>
              <label
                htmlFor="talent-type"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Kind of work
              </label>
              <select
                id="talent-type"
                value={employmentType}
                onChange={(e) => changeFilter(setEmploymentType)(e.target.value)}
                className="mt-1 rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
              >
                <option value="">Any</option>
                {EMPLOYMENT_TYPES.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={openToWorkOnly}
                onChange={(e) => changeFilter(setOpenToWorkOnly)(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-600"
              />
              Open to work only
            </label>
          </>
        )}

        {isAdmin && (
          <div>
            <label
              htmlFor="talent-account-type"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Account type
            </label>
            <select
              id="talent-account-type"
              value={accountType}
              onChange={(e) => changeFilter(setAccountType)(e.target.value)}
              className="mt-1 rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
            >
              <option value="jobseeker">Job seekers</option>
              <option value="employer">Employers</option>
            </select>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="mt-10 grid place-items-center text-slate-500 dark:text-slate-400">
          <Spinner label="Loading people" />
        </div>
      ) : users.length === 0 && !error ? (
        <p className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400">
          Nobody matches those filters.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((person) => (
            <li
              key={person.id}
              className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            >
              <div className="flex items-start gap-4">
                <Avatar name={person.name} src={person.avatarUrl} />

                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-slate-900 dark:text-slate-100">
                    {person.name}
                  </h2>
                  <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                    {person.company?.name ||
                      person.profile.position ||
                      'No position given'}
                  </p>
                  {person.profile.openToWork && <OpenToWorkBadge className="mt-2" />}
                </div>
              </div>

              <dl className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                {person.profile.industry && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-500">Industry:</dt>
                    <dd>{labelFor(INDUSTRIES, person.profile.industry)}</dd>
                  </div>
                )}
                {!isEmployerList && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-500">Experience:</dt>
                    <dd>
                      {person.profile.yearsExperience} year
                      {person.profile.yearsExperience === 1 ? '' : 's'}
                    </dd>
                  </div>
                )}
                {person.profile.location && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-500">Location:</dt>
                    <dd className="truncate">{person.profile.location}</dd>
                  </div>
                )}
                {person.profile.employmentTypes.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500 dark:text-slate-500">Wants:</dt>
                    <dd className="truncate">
                      {person.profile.employmentTypes
                        .map((type) => labelFor(EMPLOYMENT_TYPES, type))
                        .join(', ')}
                    </dd>
                  </div>
                )}
              </dl>

              {/* The wrapper carries the spacing, not the button: padding
                  on the button itself would make the button taller rather
                  than move it away from the details above. `mt-auto`
                  pushes it to the bottom so every card's button lines up,
                  however much detail the person has filled in. */}
              <div className="mt-auto pt-4">
                <Button
                  as={Link}
                  to={`/talent/${person.id}`}
                  size="sm"
                  variant="secondary"
                  className="w-full"
                >
                  View details
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && users.length > 0 && (
        <Pagination pagination={pagination} onChange={setPage} label="people" />
      )}
    </div>
  );
}
