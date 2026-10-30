function p=load_project(input)
% Portable network definition; no hard-coded Spanish station or route IDs.
if ischar(input) || isstring(input), p=jsondecode(fileread(input)); else, p=input; end
required={'version','id','name','description','parameters','nodes','edges','trains','analysisRoute'};
assert(isstruct(p) && all(isfield(p,required)),'RailLab:Project','Incomplete network definition.');
assert(p.version==1,'RailLab:Project','Unsupported network format version.');
q=p.parameters;
keys={'step_s','sample_s','duration_s','block_m','loop_m','lookahead_m', ...
    'response_s','reserve_m','release_m','terminal_m','terminal_kmh'};
assert(all(isfield(q,keys)),'RailLab:Project','Missing simulation/control parameters.');
for k=1:numel(keys), validateattributes(q.(keys{k}),{'numeric'},{'scalar','finite','nonnegative'}); end
assert(q.step_s>=.2 && q.step_s<=2 && q.sample_s>=q.step_s && q.duration_s>0);
assert(abs(q.sample_s/q.step_s-round(q.sample_s/q.step_s))<1e-9);
assert(q.block_m>=25 && q.loop_m>0 && q.lookahead_m>q.reserve_m);
assert(numel(p.nodes)>=2 && numel(p.nodes)<=300 && numel(p.edges)>=1 && numel(p.edges)<=600);
assert(numel(p.trains)>=1 && numel(p.trains)<=64);
assert(q.duration_s/q.step_s*numel(p.trains)<=2000000,'RailLab:Project','Simulation step budget exceeded.');
assert(q.duration_s/q.sample_s*numel(p.trains)<=300000,'RailLab:Project','Trace budget exceeded.');
assert(isequal([p.nodes.id],1:numel(p.nodes)) && isequal([p.edges.id],1:numel(p.edges)), ...
    'RailLab:Project','Node and edge IDs must be consecutive, starting at 1.');
assert(numel(unique(string({p.trains.id})))==numel(p.trains),'RailLab:Project','Duplicate train ID.');
for n=p.nodes(:)'
    assert(ischar(n.name) && ~isempty(n.name));
    validateattributes([n.x n.y],{'numeric'},{'finite','numel',2});
    assert(isscalar(n.passingLoop) && islogical(n.passingLoop));
    assert(ismember(n.junction,{'none','directional','exclusive'}));
    assert(ismember(n.labelSide,{'left','right','top','bottom'}));
end
for n=p.nodes(:)'
    degree=sum([p.edges.fromNode]==n.id | [p.edges.toNode]==n.id);
    assert(degree<=2 || ~strcmp(n.junction,'none'),'RailLab:Project','A converging node needs a junction reservation.');
end
for e=p.edges(:)'
    validateattributes([e.fromNode e.toNode],{'numeric'},{'integer','>=',1,'<=',numel(p.nodes)});
    assert(e.fromNode~=e.toNode && ismember(e.tracks,[1 2]));
    validateattributes(e.length_m,{'numeric'},{'scalar','finite','positive'});
    validateattributes(e.maxSpeed_kmh,{'numeric'},{'scalar','finite','positive','<=',400});
    validateattributes(e.gauges_mm,{'numeric'},{'vector','nonempty','integer','positive'});
    margins=q.loop_m*(p.nodes(e.fromNode).passingLoop+p.nodes(e.toNode).passingLoop);
    assert(e.length_m>margins,'RailLab:Project','Edge too short for configured holding areas.');
end
resourceEstimate=sum(ceil([p.edges.length_m]/q.block_m)*2+8);
assert(resourceEstimate<=20000,'RailLab:Project','Too many block resources for an interactive run.');
for i=1:numel(p.trains)
    tr=p.trains(i);
    assert(~isempty(regexp(tr.id,'^[A-Za-z0-9_-]{1,24}$','once')),'RailLab:Project','Invalid train identifier.');
    validateattributes(tr.departure_s,{'numeric'},{'scalar','finite','nonnegative','<',q.duration_s});
    validateattributes(tr.length_m,{'numeric'},{'scalar','finite','positive'});
    validateattributes(tr.gauge_mm,{'numeric'},{'scalar','integer','positive'});
    validateattributes(tr.maxSpeed_kmh,{'numeric'},{'scalar','finite','positive','<=',400});
    validateattributes([tr.acceleration_mps2 tr.brake_mps2],{'numeric'},{'finite','positive','<=',3});
    nodes=network.route_nodes(tr.route,p.edges);
    for signed=tr.route(:)'
        e=p.edges(abs(signed));
        assert(ismember(tr.gauge_mm,e.gauges_mm),'RailLab:Project','Train gauge incompatible with an edge.');
        if e.tracks==1 && (p.nodes(e.fromNode).passingLoop || p.nodes(e.toNode).passingLoop)
            assert(tr.length_m+q.release_m<q.loop_m,'RailLab:Project','Train does not fit the abstract single-track holding area.');
        end
    end
    stopIndex=1;
    for stop=tr.stops(:)'
        j=find(nodes==stop.node & (1:numel(nodes))>stopIndex,1);
        assert(~isempty(j),'RailLab:Project','Stops must follow the route order.');
        stopIndex=j; validateattributes(stop.dwell_s,{'numeric'},{'scalar','finite','nonnegative'});
    end
    assert(stopIndex==numel(nodes),'RailLab:Project','The last stop must be the route destination.');
    for j=2:numel(nodes)-1
        if strcmp(p.nodes(nodes(j)).junction,'directional')
            assert(sign(tr.route(j-1))==sign(tr.route(j)), ...
                'RailLab:Project','Use an exclusive junction when edge orientation changes at a junction.');
        end
    end
end
network.route_nodes(p.analysisRoute,p.edges);
if ~isfield(p,'gpsFaults'), p.gpsFaults=struct([]); end
for i=1:numel(p.edges)
    if ~isfield(p.edges,'gps') || isempty(p.edges(i).gps), p.edges(i).gps='unknown'; end
    assert(ismember(p.edges(i).gps,{'available','unavailable','unknown'}));
end
for f=p.gpsFaults(:)'
    validateattributes(f.edge,{'numeric'},{'scalar','integer','>=',1,'<=',numel(p.edges)});
    validateattributes([f.start_s f.end_s],{'numeric'},{'finite','nonnegative'});
    assert(f.end_s>f.start_s && ismember(f.status,{'available','unavailable','unknown'}));
end
end
