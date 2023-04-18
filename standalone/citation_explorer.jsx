// TODOs:
// - add ability to hide papers (put into a "hidden papers" table)
// - don't double-count edges (e.g., paper A cites B twice, or A and B both cite each other)
// - make saving + loading work
// - "Lose changes" dialog when leaving page
// - autosave + reset (local storage? 5MB limit seems small; maybe enough to just save paper IDs)
// - error handling for adding a paper by ID
// - add ability to change max references fetched per paper
// - handle small screens?

const { useState, useEffect } = React

const PAPER_FIELDS = ["url", "title", "venue", "year", "authors", "citationCount"].join();
const MAX_REFERENCES_PER_PAPER = 200; // max = 1000

// API calls
// see https://api.semanticscholar.org/api-docs/graph#tag/Paper-Data for API documentation
async function fetchPaperInfo(paper_id) {
    // fetch details about a single paper
    const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${paper_id}?fields=${PAPER_FIELDS}`);
    var paper_info = await response.json();
    // fill in some extra fields
    paper_info = {...paper_info, fetched_related: false, reference_ids: [], citation_ids: []};

    return paper_info;
}

async function fetchPaperCitations(paper_id) {
    // return a list of papers that cite the given paper
    // TODO: handle pagination
    const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${paper_id}/citations?fields=${PAPER_FIELDS}&limit=${MAX_REFERENCES_PER_PAPER}`);
    const citations = await response.json();
    return citations['data'].map(
        citation => ({...citation.citingPaper, fetched_related: false, reference_ids: [], citation_ids: []})
    )
}

async function fetchPaperReferences(paper_id) {
    // return a list of papers that are referenced by the given paper
    const response = await fetch(`https://api.semanticscholar.org/graph/v1/paper/${paper_id}/references?fields=${PAPER_FIELDS}&limit=${MAX_REFERENCES_PER_PAPER}`);
    const references = await response.json();
    return references['data'].map(
        reference => ({...reference.citedPaper, fetched_related: false, reference_ids: [], citation_ids: []})
    )
}

function LoadSaveButtons() {
    function load() {
        alert("🚧 Under construction");
    }

    function save() {
        alert("🚧 Under construction");
    }

    return (
        <div>
            <button type="button" className="btn btn-primary" onClick={load}>Load</button>
            <button type="button" className="btn btn-primary" onClick={save}>Save</button>
        </div>
    );
}

function PaperLookup({addPaper}) {
    const [paperId, setPaperId] = useState("");

    async function handleClick() {
        await addPaper(paperId);
        setPaperId("");
    }

    return (
        <>
            <div>
                <label htmlFor="add_paper_id">Add Paper by ID</label>
            </div>

            <div className="input-group">
                <input type="text" 
                    value={paperId} 
                    onChange={e => setPaperId(e.target.value)} 
                    onKeyDown={e => {if(e.key == "Enter"){handleClick()}}}
                    className="form-control" 
                    id="add_paper_id" 
                    placeholder="Semantic Scholar ID" 
                    aria-describedby="paper_id_help_block"
                />
                <button type="button" onClick={handleClick} id="add_paper_button" className="btn btn-outline-primary" >Add Paper</button>
            </div>

            <div>
                <small id="paper_id_help_block" className="form-text text-muted" style={{'whiteSpace': 'pre-line'}}>
                    Example: a21734255dc92b9ac8de336f2a41bfa77a2e0193 <br/> (TODO: document what kinds of IDs are supported)
                </small>
            </div>
        </>
    );
}

function PaperTable({paperInfo, selectedPapers, hiddenPapers, numRelatedPapers, selectPaper, deselectPaper, hidePaper, unhidePaper}) {
    const [primarySort, setPrimarySort] = useState([5, "desc"]);
    const [secondarySort, setSecondarySort] = useState([4, "desc"]);

    // build columns programmatically
    const columns = [
        // Special column: (de)select paper
        // Special column: hide button
        {
            name: "Title",
            value: (paper_id) => paperInfo[paper_id].title,
            width: '30%'
        },
        {
            name: "Authors",
            value: (paper_id) => paperInfo[paper_id].authors.map(author => author.name).join(", "),
            width: '25%'
        },
        {
            name: "Venue",
            value: (paper_id) => paperInfo[paper_id].venue,
            width: '20%'
        },
        {
            name: "Year",
            value: (paper_id) => paperInfo[paper_id].year,
            width: '3.5em',
        },
        {
            name: "Citations",
            value: (paper_id) => paperInfo[paper_id].citationCount,
            width: '5em',
        },
        {
            name: "Edges",
            value: (paper_id) => numRelatedPapers[paper_id],
            width: '4em',
        },
        // Special column: link to paper
    ];

    function sortPapers(paper_ids, [primarySortIdx, primarySortDirection], [secondarySortIdx, secondarySortDirection]) {
        // sort papers by selected sort column
        paper_ids.sort((a, b) => {
            const id_a = paperInfo[a].paperId;
            const id_b = paperInfo[b].paperId;

            // make primary comparison
            const primary_a = columns[primarySortIdx].value(id_a);
            const primary_b = columns[primarySortIdx].value(id_b);
            if (primary_a !== primary_b) {
                return (primary_a < primary_b ? -1 : 1) * (primarySortDirection === "asc" ? 1 : -1);
            }

            // otherwise, compare by secondary column
            const secondary_a = columns[secondarySortIdx].value(a);
            const secondary_b = columns[secondarySortIdx].value(b);
            if (secondary_a !== secondary_b) {
                return (secondary_a < secondary_b ? -1 : 1) * (secondarySortDirection === "asc" ? 1 : -1);
            }

            // if no difference, a and b are equal
            return 0;
        });
        return paper_ids;
    }

    const sort_options = columns.flatMap((column, idx) => [
        <option key={2*idx}   value={JSON.stringify([idx, 'desc'])}>{column.name} ↓</option>,
        <option key={2*idx+1} value={JSON.stringify([idx, 'asc' ])}>{column.name} ↑</option>,
    ])

    // sort papers by selected sort column
    var paper_ids = Object.keys(paperInfo);

    return (
        <>
        <form>
            <div className="row">
                <div className="mb-3 col-md-4">
                    <label htmlFor="primarySort" className="text-muted"><small>Primary sort</small></label>
                    <select className="form-control form-select col-sm" id="primarySort" value={JSON.stringify(primarySort)} onChange={e => setPrimarySort(JSON.parse(e.target.value))}>
                        {sort_options}
                    </select>
                </div>
                <div className="mb-3 col-md-4">
                    <label htmlFor="secondarySort" className="text-muted"><small>Secondary sort</small></label>
                    <select className="form-control form-select col-sm" id="secondarySort" value={JSON.stringify(secondarySort)} onChange={e => setSecondarySort(JSON.parse(e.target.value))}>
                        {sort_options}
                    </select>
                </div>
            </div>
        </form>
        <table className="table sorted-table" id="paper_table">
            <thead>
                <tr>
                    <th className="no-sort table-icon"></th>
                    <th className="no-sort table-icon"></th>
                    {columns.map((column, index) => {
                        return (
                            <th key={index} scope="col" style={{width: column.width, maxWidth: column.maxWidth}}>{column.name}</th>
                        );
                    })}
                    <th scope="col" className="no-sort table-icon" style={{width: '2em'}}>Link</th>
                </tr>
            </thead>
            <tbody>
                {sortPapers(paper_ids, primarySort, secondarySort).map(paper_id => {
                    const paper = paperInfo[paper_id];
                    return (
                        <tr key={paper_id} className={selectedPapers.includes(paper_id) ? "selected-paper" : ""}>
                            <td className="paper-selector table-icon">
                                {selectedPapers.includes(paper_id)
                                    ? <span onClick={() => deselectPaper(paper_id)}>➖</span>
                                    : <span onClick={() => selectPaper(paper_id)}>➕</span>
                                }
                            </td>
                            <td className="table-icon">
                                {hiddenPapers.includes(paper_id)
                                    ? <span onClick={() => unhidePaper(paper_id)}>🚫</span>
                                    : selectedPapers.includes(paper_id)
                                    ? ""
                                    : <span onClick={() => hidePaper(paper_id)}>🚫</span>
                                }
                            </td>
                            <td>{paper.title}</td>
                            <td>{paper.authors.map(author => author.name).join(', ')}</td>
                            <td>{paper.venue}</td>
                            <td>{paper.year}</td>
                            <td>{paper.citationCount}</td>
                            <td>{numRelatedPapers[paper_id]}</td>
                            <td className="table-icon"><a href={paper.url} target="_blank" rel="noopener noreferrer" className="paper-link">🔗</a></td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
        </>
    );
}

function StatusBar({message}) {
    if (message === "") {
        return null;
    } else {
        return (
            <div className="container-fluid fixed-bottom m-0 p-1">
            <div className="float-end col-md alert alert-info px-2 py-1 m-2">
            <div className="spinner-border spinner-border-sm text-info m-0" role="status"/>
            <span className="ms-2 me-0 my-0 p-0">{message}</span>
            </div>
            </div>
        )
    }
}

function CitationExplorerApp() {
    // info about the papers
    const [paperInfo, setPaperInfo] = useState({});
    const [numRelatedPapers, setNumRelatedPapers] = useState({});
    const [selectedPapers, setSelectedPapers] = useState([]);
    const [hiddenPapers, setHiddenPapers] = useState([]);
    const [statusMessage, setStatusMessage] = useState("");

    // use an effect to update details about papers when selected list changes
    useEffect(() => {
        updateNumRelatedPapers(selectedPapers);
        // updatePaperList(selectedPapers);
    }, [paperInfo, selectedPapers]);

    function updateNumRelatedPapers(selectedPapers) {
        var newNumRelatedPapers = {}
        Object.keys(paperInfo).forEach(paper_id => {
            newNumRelatedPapers[paper_id] = 0;
        })

        selectedPapers.forEach(paper_id => {
            // add the paper itself
            newNumRelatedPapers[paper_id] += 1;
            // add the references and citations
            paperInfo[paper_id].reference_ids.forEach(reference_id => {newNumRelatedPapers[reference_id] += 1});
            paperInfo[paper_id].citation_ids.forEach(citation_id => {newNumRelatedPapers[citation_id] += 1});
        });

        setNumRelatedPapers(newNumRelatedPapers);
    }

    function updatePaperList(selectedPapers) {
        // TODO: prune list to stop it from getting big.
        // seems hard -- error prone...
        var papers_to_keep = [];
        selectedPapers.forEach(paper_id => {
            // add the paper itself
            papers_to_keep.push(paper_id);
            // add the references and citations
            paperInfo[paper_id].reference_ids.forEach(reference_id => {papers_to_keep.push(reference_id)});
            paperInfo[paper_id].citation_ids.forEach(citation_id => {papers_to_keep.push(citation_id)});
        });

        // also add hidden papers
        // hiddenPapers.forEach(paper_id => {papers_to_keep.push(paper_id)});
        
        // remove duplicates
        console.log(papers_to_keep);
        papers_to_keep = [...new Set(papers_to_keep)];

        console.log(papers_to_keep);

        var new_paper_info = {};
        papers_to_keep.forEach(paper_id => {new_paper_info[paper_id] = paperInfo[paper_id];});
        setPaperInfo(new_paper_info);
    }

    async function addRelated(paper_id) {
        // fetch info about references and citations
        setStatusMessage("Fetching references...");
        var references = await fetchPaperReferences(paper_id);
        setStatusMessage("Fetching citations...");
        var citations = await fetchPaperCitations(paper_id);

        // add info about related papers
        references.forEach(reference => {
            if (reference.paperId !== null && !(reference.paperId in paperInfo)) {
                setPaperInfo(paperInfo => (
                    {...paperInfo, [reference.paperId]: reference}
                ))
            }
        });
        citations.forEach(citation => {
            if (citation.paperId !== null && !(citation.paperId in paperInfo)) {
                setPaperInfo(paperInfo => (
                    {...paperInfo, [citation.paperId]: citation}
                ))
            }
        });

        // add references and citations to the paper info
        console.log('setting info for paper ' + paper_id);
        
        var updated_paper = {...paperInfo[paper_id]};
        updated_paper.reference_ids = references.map(reference => reference.paperId);
        updated_paper.citation_ids = citations.map(citation => citation.paperId);
        setPaperInfo(paperInfo => (
            {...paperInfo, [paper_id]: {
                ...paperInfo[paper_id],
                reference_ids: references.map(reference => reference.paperId),
                citation_ids: citations.map(citation => citation.paperId)
            }}
        ));
        
        setStatusMessage("");
    }

    async function addPaperByID(requested_paper_id) {
        setStatusMessage("Fetching paper details...");
        var paper = await fetchPaperInfo(requested_paper_id);
        var paper_id = paper.paperId;

        setPaperInfo(paperInfo => ({...paperInfo, [paper_id]: paper}));
        setSelectedPapers(selectedPapers => [...selectedPapers, paper_id]);
        // setHiddenPapers(hiddenPapers => hiddenPapers.filter(paper_id => paper_id !== paper_id));

        await addRelated(requested_paper_id);
    }

    async function selectPaper(id_to_select) {
        // mark a paper as selected and add its references and citations to the paper list
        setSelectedPapers(selectedPapers => [...selectedPapers, id_to_select]);
        // setHiddenPapers(hiddenPapers => hiddenPapers.filter(paper_id => paper_id !== id_to_select))
        await addRelated(id_to_select);
    }

    function deselectPaper(id_to_deselect) {
        // mark a paper as unselected
        setSelectedPapers(selectedPapers => selectedPapers.filter(paper_id => paper_id !== id_to_deselect));
    }

    function hidePaper(id_to_hide) {
        // mark a paper as hidden
        alert("🚧 Under construction");
        // setHiddenPapers(hiddenPapers => [...hiddenPapers, id_to_hide]);
    }

    function unhidePaper(id_to_unhide) {
        // mark a paper as unhidden
        alert("🚧 Under construction");
        // setHiddenPapers(hiddenPapers => hiddenPapers.filter(paper_id => paper_id !== id_to_unhide));
    }

    return (
        <>
            <h1 style={{'fontWeight':'lighter'}}>Citation Explorer</h1>
        
            <LoadSaveButtons />
            <PaperLookup addPaper={addPaperByID}/>

            <PaperTable paperInfo={paperInfo} selectedPapers={selectedPapers} hiddenPapers={hiddenPapers} numRelatedPapers={numRelatedPapers} selectPaper={selectPaper} deselectPaper={deselectPaper} hidePaper={hidePaper} unhidePaper={unhidePaper}
            />
            <StatusBar message={statusMessage}/>
        </>
    );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<CitationExplorerApp />);
