// TODOs:
// - don't double-count edges (e.g., paper A cites B twice, or A and B both cite each other)
// - make change log scrollable
// - "Lose changes" dialog when leaving page
// - autosave + reset (local storage? 5MB limit seems small; maybe enough to just save paper IDs)
// - error handling for adding a paper by ID
// - add ability to change max references fetched per paper
// - handle small screens?

const { useState, useEffect, useRef } = React;

const PAPER_FIELDS = [
  "url",
  "title",
  "venue",
  "year",
  "authors",
  "citationCount",
].join();
const MAX_REFERENCES_PER_PAPER = 200; // max = 1000

function makePaper(paper_info) {
  return {
    ...paper_info,
    fetched_related: false,
    reference_ids: [],
    citation_ids: [],
  };
}

async function fetchRetry({
  url,
  max_retries = 4,
  delay = 500,
  callback = null,
}) {
  for (let i = 0; i < max_retries; i++) {
    try {
      // SemanticScholar does not set correct CORS headers when rate limiting (429, Too many requests),
      // which will throw an exception rather than a normal response.
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          // In case they fix the CORS headers, throw to still trigger the retry mechanism.
          throw new Error("Too many requests");
        }
      }

      return response;
    } catch (error) {
      console.info(
        `Encountered error, most likely hitting the rate limit. Trying again in ${delay} ms.`,
      );
      console.info(error);
      callback?.(delay);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  callback?.(null);
}

// ----- API calls ------------------------------------------------------------
// see https://api.semanticscholar.org/api-docs/graph#tag/Paper-Data for API documentation
async function fetchPaperInfo(paper_id, callback = null) {
  // fetch details about a single paper
  const response = await fetchRetry({
    url: `https://api.semanticscholar.org/graph/v1/paper/${paper_id}?fields=${PAPER_FIELDS}`,
    callback: callback,
  });

  if (response.ok) {
    const paper_info = await response.json();
    return makePaper(paper_info);
  } else {
    return null;
  }
}

async function fetchPaperCitations(paper_id, callback = null) {
  // return a list of papers that cite the given paper
  // TODO: handle pagination
  const response = await fetchRetry({
    url: `https://api.semanticscholar.org/graph/v1/paper/${paper_id}/citations?fields=${PAPER_FIELDS}&limit=${MAX_REFERENCES_PER_PAPER}`,
    callback: callback,
  });
  if (response.ok) {
    const citations = await response.json();
    return citations["data"].map((citation) => makePaper(citation.citingPaper));
  } else {
    return null;
  }
}

async function fetchPaperReferences(paper_id, callback = null) {
  // return a list of papers that are referenced by the given paper
  const response = await fetchRetry({
    url: `https://api.semanticscholar.org/graph/v1/paper/${paper_id}/references?fields=${PAPER_FIELDS}&limit=${MAX_REFERENCES_PER_PAPER}`,
    callback: callback,
  });
  if (response.ok) {
    const references = await response.json();
    return references["data"].map((reference) =>
      makePaper(reference.citedPaper),
    );
  } else {
    return null;
  }
}

// ----- React components -----------------------------------------------------
function ChangeLog() {
  const changes = [
    {
      date: "Apr 23, 2023",
      info: "Added changelog and ability to (un)hide papers",
    },
    {
      date: "Apr 18, 2023",
      info: "Added loading messages and ability to sort by secondary keys.",
    },
    { date: "Apr 17, 2023", info: "Initial release." },
  ];

  return (
    <>
      {/* button */}
      <div className="container-fluid fixed-top m-0 p-1">
        <div className="float-end col-md px-1 py-1 m-1">
          <button
            type="button"
            className="btn btn-secondary"
            data-bs-toggle="modal"
            data-bs-target="#changeLogModal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              className="bi bi-question-circle"
              viewBox="0 0 16 16"
            >
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path>
              <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* modal */}
      <div className="modal modal-lg fade" id="changeLogModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="changeLogModalLabel">
                About
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <p>
                By{" "}
                <a
                  href="https://gregdeon.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Greg d'Eon
                </a>
                .
              </p>

              {changes.map((change) => {
                return (
                  <p key={change.date}>
                    <b>{change.date}:</b> {change.info}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatusBar({ message, errorMessage }) {
  if (message === "" && errorMessage === "") {
    return null;
  } else if (errorMessage === "") {
    return (
      <div className="container-fluid fixed-bottom m-0 p-1">
        <div className="float-end col-md alert alert-info px-2 py-1 m-2">
          <div
            className="spinner-border spinner-border-sm text-info m-0"
            role="status"
          />
          <span className="ms-2 me-0 my-0 p-0">{message}</span>
        </div>
      </div>
    );
  } else {
    return (
      <div className="container-fluid fixed-bottom m-0 p-1">
        <div className="float-end col-md alert alert-danger px-2 py-1 m-2">
          <span className="ms-2 me-0 my-0 p-0">{errorMessage}</span>
        </div>
      </div>
    );
  }
}

function LoadSaveButtons({ savefunc, loadfunc }) {
  const inputFile = useRef(null);

  const onLoadButtonClick = () => {
    inputFile.current.click();
  };

  function loadFile(e) {
    const reader = new FileReader();
    reader.onload = (e) => loadfunc(JSON.parse(e.target.result));
    reader.readAsText(e.target.files[0]);
  }

  return (
    <div>
      <input
        type="file"
        id="file"
        ref={inputFile}
        style={{ display: "none" }}
        onChange={loadFile}
      />
      <button
        type="button"
        className="btn btn-primary me-1"
        onClick={onLoadButtonClick}
      >
        Load
      </button>
      <button type="button" className="btn btn-primary me-1" onClick={savefunc}>
        Save
      </button>
    </div>
  );
}

function PaperLookup({ addPaper }) {
  const [paperId, setPaperId] = useState("");

  async function handleClick() {
    await addPaper(paperId);
    setPaperId("");
  }

  return (
    <>
      <div>
        <label htmlFor="add_paper_id">
          Add Paper by{" "}
          <a
            href="https://semanticscholar.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Semantic Scholar
          </a>{" "}
          ID
        </label>
      </div>

      <div className="input-group">
        <input
          type="text"
          value={paperId}
          onChange={(e) => setPaperId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key == "Enter") {
              handleClick();
            }
          }}
          className="form-control"
          id="add_paper_id"
          placeholder="Semantic Scholar ID"
          aria-describedby="paper_id_help_block"
        />
        <button
          type="button"
          onClick={handleClick}
          id="add_paper_button"
          className="btn btn-outline-primary"
        >
          Add Paper
        </button>
      </div>

      <div>
        <small
          id="paper_id_help_block"
          className="form-text text-muted"
          style={{ whiteSpace: "pre-line" }}
        >
          Example: a21734255dc92b9ac8de336f2a41bfa77a2e0193 <br /> (TODO:
          document what kinds of IDs are supported)
        </small>
      </div>
    </>
  );
}

function PaperTable({
  paperInfo,
  selectedPapers,
  hiddenPapers,
  numRelatedPapers,
  selectPaper,
  deselectPaper,
  hidePaper,
  unhidePaper,
}) {
  const [primarySort, setPrimarySort] = useState([5, "desc"]);
  const [secondarySort, setSecondarySort] = useState([4, "desc"]);

  // build columns programmatically
  const columns = [
    // Special column: (de)select paper
    // Special column: (un)hide button
    {
      name: "Title",
      value: (paper_id) => paperInfo[paper_id].title,
      width: "30%",
    },
    {
      name: "Authors",
      value: (paper_id) =>
        paperInfo[paper_id].authors.map((author) => author.name).join(", "),
      width: "25%",
    },
    {
      name: "Venue",
      value: (paper_id) => paperInfo[paper_id].venue,
      width: "20%",
    },
    {
      name: "Year",
      value: (paper_id) => paperInfo[paper_id].year,
      width: "3.5em",
    },
    {
      name: "Citations",
      value: (paper_id) => paperInfo[paper_id].citationCount,
      width: "5em",
    },
    {
      name: "Edges",
      value: (paper_id) => numRelatedPapers[paper_id],
      width: "4em",
    },
    // Special column: link to paper
  ];

  function sortPapers(
    paper_ids,
    [primarySortIdx, primarySortDirection],
    [secondarySortIdx, secondarySortDirection],
  ) {
    // sort papers by selected sort column
    paper_ids.sort((a, b) => {
      const id_a = paperInfo[a].paperId;
      const id_b = paperInfo[b].paperId;

      // make primary comparison
      const primary_a = columns[primarySortIdx].value(id_a);
      const primary_b = columns[primarySortIdx].value(id_b);
      if (primary_a !== primary_b) {
        return (
          (primary_a < primary_b ? -1 : 1) *
          (primarySortDirection === "asc" ? 1 : -1)
        );
      }

      // otherwise, compare by secondary column
      const secondary_a = columns[secondarySortIdx].value(a);
      const secondary_b = columns[secondarySortIdx].value(b);
      if (secondary_a !== secondary_b) {
        return (
          (secondary_a < secondary_b ? -1 : 1) *
          (secondarySortDirection === "asc" ? 1 : -1)
        );
      }

      // if no difference, a and b are equal
      return 0;
    });
    return paper_ids;
  }

  const sort_options = columns.flatMap((column, idx) => [
    <option key={2 * idx} value={JSON.stringify([idx, "desc"])}>
      {column.name} ↓
    </option>,
    <option key={2 * idx + 1} value={JSON.stringify([idx, "asc"])}>
      {column.name} ↑
    </option>,
  ]);

  const table_header = (
    <thead>
      <tr>
        <th className="no-sort table-icon"></th>
        <th className="no-sort table-icon"></th>
        {columns.map((column, index) => {
          return (
            <th
              key={index}
              scope="col"
              style={{ width: column.width, maxWidth: column.maxWidth }}
            >
              {column.name}
            </th>
          );
        })}
        <th scope="col" className="no-sort table-icon" style={{ width: "2em" }}>
          Link
        </th>
      </tr>
    </thead>
  );

  function table_body(paper_ids) {
    return (
      <tbody>
        {sortPapers(paper_ids, primarySort, secondarySort).map((paper_id) => {
          const paper = paperInfo[paper_id];
          return (
            <tr
              key={paper_id}
              className={
                selectedPapers.includes(paper_id) ? "selected-paper" : ""
              }
            >
              <td className="paper-selector table-icon">
                {selectedPapers.includes(paper_id) ? (
                  <span onClick={() => deselectPaper(paper_id)}>➖</span>
                ) : hiddenPapers.includes(paper_id) ? (
                  ""
                ) : (
                  <span onClick={() => selectPaper(paper_id)}>➕</span>
                )}
              </td>
              <td className="paper-hider table-icon">
                {hiddenPapers.includes(paper_id) ? (
                  <span onClick={() => unhidePaper(paper_id)}>🟢</span>
                ) : selectedPapers.includes(paper_id) ? (
                  ""
                ) : (
                  <span onClick={() => hidePaper(paper_id)}>🚫</span>
                )}
              </td>
              <td>{paper.title}</td>
              <td>{paper.authors.map((author) => author.name).join(", ")}</td>
              <td>{paper.venue}</td>
              <td>{paper.year}</td>
              <td>{paper.citationCount}</td>
              <td>{numRelatedPapers[paper_id]}</td>
              <td className="table-icon">
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="paper-link"
                >
                  🔗
                </a>
              </td>
            </tr>
          );
        })}
      </tbody>
    );
  }

  // sort papers by selected sort column
  var paper_ids = Object.keys(paperInfo);
  var visible_paper_ids = paper_ids.filter(
    (paper_id) => !hiddenPapers.includes(paper_id),
  );

  return (
    <>
      <form>
        <div className="row" style={{ background: "white" }}>
          <div className="mb-3 col-md-4">
            <label htmlFor="primarySort" className="text-muted">
              <small>Primary sort</small>
            </label>
            <select
              className="form-control form-select col-sm"
              id="primarySort"
              value={JSON.stringify(primarySort)}
              onChange={(e) => setPrimarySort(JSON.parse(e.target.value))}
            >
              {sort_options}
            </select>
          </div>
          <div className="mb-3 col-md-4">
            <label htmlFor="secondarySort" className="text-muted">
              <small>Secondary sort</small>
            </label>
            <select
              className="form-control form-select col-sm"
              id="secondarySort"
              value={JSON.stringify(secondarySort)}
              onChange={(e) => setSecondarySort(JSON.parse(e.target.value))}
            >
              {sort_options}
            </select>
          </div>
        </div>
      </form>
      <table className="table sorted-table" id="paper_table">
        {table_header}
        {table_body(visible_paper_ids)}
      </table>

      <hr />

      <div className="accordion accordion-flush m-0 p-0">
        <div className="accordion-item m-0 p-0">
          <h5
            className="accordion-header text-muted"
            style={{ fontWeight: "lighter" }}
            id="flush-headingOne"
          >
            <button
              className="accordion-button collapsed"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#hidden_paper_table_wrapper"
              aria-expanded="false"
              aria-controls="flush-collapseOne"
            >
              Hidden papers
            </button>
          </h5>
          <div
            className="accordion-collapse collapse"
            id="hidden_paper_table_wrapper"
          >
            <table className="table sorted-table" id="hidden_paper_table">
              {table_header}
              {table_body(hiddenPapers)}
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ----- Main component -------------------------------------------------------
function CitationExplorerApp() {
  // info about the papers
  const [paperInfo, setPaperInfo] = useState({});
  const [numRelatedPapers, setNumRelatedPapers] = useState({});
  const [selectedPapers, setSelectedPapers] = useState([]);
  const [hiddenPapers, setHiddenPapers] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function info(message) {
    console.info(message);
    setStatusMessage(message);
    setErrorMessage("");
  }

  function error(message) {
    console.error(message);
    setErrorMessage(message);
    setStatusMessage("");
  }

  function retryCallback(delay) {
    if (delay === null) {
      error("Failed to fetch data. Try again later.");
    } else {
      info("Too many requests. Retrying in " + delay + "ms");
    }
  }

  function save() {
    var tmp_link = document.createElement("a");
    var file = new Blob([JSON.stringify(selectedPapers)], {
      type: "application/json",
    });
    tmp_link.href = URL.createObjectURL(file);
    tmp_link.download = `citation_explorer_${new Date().toISOString()}.json`;
    tmp_link.click();
  }

  async function load(newSelectedPapers) {
    setPaperInfo({});
    setNumRelatedPapers({});
    setSelectedPapers([]);
    setHiddenPapers([]);
    console.log("Loading papers: " + newSelectedPapers);

    for (const paper_id of newSelectedPapers) {
      await addPaperByID(paper_id);
    }
  }

  // use an effect to update details about papers when selected list changes
  useEffect(() => {
    updateNumRelatedPapers(selectedPapers);
    // updatePaperList(selectedPapers);
  }, [paperInfo, selectedPapers]);

  function updateNumRelatedPapers(selectedPapers) {
    var newNumRelatedPapers = {};
    Object.keys(paperInfo).forEach((paper_id) => {
      newNumRelatedPapers[paper_id] = 0;
    });

    selectedPapers.forEach((paper_id) => {
      // add the paper itself
      newNumRelatedPapers[paper_id] += 1;
      // add the references and citations
      paperInfo[paper_id].reference_ids.forEach((reference_id) => {
        newNumRelatedPapers[reference_id] += 1;
      });
      paperInfo[paper_id].citation_ids.forEach((citation_id) => {
        newNumRelatedPapers[citation_id] += 1;
      });
    });

    setNumRelatedPapers(newNumRelatedPapers);
  }

  function updatePaperList(selectedPapers) {
    // TODO: prune list to stop it from getting big.
    // seems hard -- error prone...
    var papers_to_keep = [];
    selectedPapers.forEach((paper_id) => {
      // add the paper itself
      papers_to_keep.push(paper_id);
      // add the references and citations
      paperInfo[paper_id].reference_ids.forEach((reference_id) => {
        papers_to_keep.push(reference_id);
      });
      paperInfo[paper_id].citation_ids.forEach((citation_id) => {
        papers_to_keep.push(citation_id);
      });
    });

    // also add hidden papers
    // hiddenPapers.forEach(paper_id => {papers_to_keep.push(paper_id)});

    // remove duplicates
    console.log(papers_to_keep);
    papers_to_keep = [...new Set(papers_to_keep)];

    console.log(papers_to_keep);

    var new_paper_info = {};
    papers_to_keep.forEach((paper_id) => {
      new_paper_info[paper_id] = paperInfo[paper_id];
    });
    setPaperInfo(new_paper_info);
  }

  async function addRelated(paper_id) {
    // fetch info about references and citations
    info("Fetching references...");
    var references = await fetchPaperReferences(paper_id, retryCallback);

    if (references == null) {
      error("Unable to fetch references");
      return;
    }

    info("Fetching citations...");
    var citations = await fetchPaperCitations(paper_id, retryCallback);
    if (citations == null) {
      error("Unable to fetch citations...");
      return;
    }

    // add info about related papers
    references.forEach((reference) => {
      if (reference.paperId !== null && !(reference.paperId in paperInfo)) {
        setPaperInfo((paperInfo) => ({
          ...paperInfo,
          [reference.paperId]: reference,
        }));
      }
    });
    citations.forEach((citation) => {
      if (citation.paperId !== null && !(citation.paperId in paperInfo)) {
        setPaperInfo((paperInfo) => ({
          ...paperInfo,
          [citation.paperId]: citation,
        }));
      }
    });

    // add references and citations to the paper info
    console.log("setting info for paper " + paper_id);

    var updated_paper = { ...paperInfo[paper_id] };
    updated_paper.reference_ids = references.map(
      (reference) => reference.paperId,
    );
    updated_paper.citation_ids = citations.map((citation) => citation.paperId);
    setPaperInfo((paperInfo) => ({
      ...paperInfo,
      [paper_id]: {
        ...paperInfo[paper_id],
        reference_ids: references.map((reference) => reference.paperId),
        citation_ids: citations.map((citation) => citation.paperId),
      },
    }));

    setStatusMessage("");
  }

  async function addPaperByID(requested_paper_id) {
    info("Fetching paper details...");
    const paper = await fetchPaperInfo(requested_paper_id, retryCallback);

    if (paper == null) {
      error("Paper not found");
      return;
    }

    // SemanticScholar might have multiple ids mapping to the same paper.
    // We are not guaranteed to have `requested_paper_id == paper.paperId`.
    // For example both
    // https://www.semanticscholar.org/paper/a21734255dc92b9ac8de336f2a41bfa77a2e0193
    // https://www.semanticscholar.org/paper/c3965268b206ec8e7207ce8a74da19530e977460
    // return c3965268b206ec8e7207ce8a74da19530e977460.
    // Normalizing to the paperId returned by the API.
    const paper_id = paper.paperId;

    if (paper_id == null) {
      console.error("Paper ID is null or undefined");
      console.log(requested_paper_id, paper);
    }

    setPaperInfo((paperInfo) => ({ ...paperInfo, [paper_id]: paper }));
    setSelectedPapers((selectedPapers) => [...selectedPapers, paper_id]);

    await addRelated(paper_id);
  }

  async function selectPaper(id_to_select) {
    // mark a paper as selected and add its references and citations to the paper list
    setSelectedPapers((selectedPapers) => [...selectedPapers, id_to_select]);
    await addRelated(id_to_select);
  }

  function deselectPaper(id_to_deselect) {
    // mark a paper as unselected
    setSelectedPapers((selectedPapers) =>
      selectedPapers.filter((paper_id) => paper_id !== id_to_deselect),
    );
  }

  function hidePaper(id_to_hide) {
    // mark a paper as hidden
    setHiddenPapers((hiddenPapers) => [...hiddenPapers, id_to_hide]);
  }

  function unhidePaper(id_to_unhide) {
    // mark a paper as unhidden
    setHiddenPapers((hiddenPapers) =>
      hiddenPapers.filter((paper_id) => paper_id !== id_to_unhide),
    );
  }

  return (
    <>
      <h1 style={{ fontWeight: "lighter" }}>Citation Explorer</h1>

      <ChangeLog />

      <LoadSaveButtons savefunc={save} loadfunc={load} />
      <PaperLookup addPaper={addPaperByID} />

      <PaperTable
        paperInfo={paperInfo}
        selectedPapers={selectedPapers}
        hiddenPapers={hiddenPapers}
        numRelatedPapers={numRelatedPapers}
        selectPaper={selectPaper}
        deselectPaper={deselectPaper}
        hidePaper={hidePaper}
        unhidePaper={unhidePaper}
      />

      <StatusBar message={statusMessage} errorMessage={errorMessage} />
    </>
  );
}

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<CitationExplorerApp />);
