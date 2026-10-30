function [net,trains,c]=compile_project(input)
% Compile a validated graph and timetable into shared model resources.
p=network.load_project(input); q=p.parameters; c=network.config();
c.dt=q.step_s; c.sampleSeconds=q.sample_s; c.maxTime=q.duration_s;
c.blockLength=q.block_m; c.stationHalfLength=q.loop_m; c.lookahead=q.lookahead_m;
c.response=q.response_s; c.reserve=q.reserve_m; c.releaseMargin=q.release_m;
c.terminalApproach=q.terminal_m; c.terminalSpeed=q.terminal_kmh/3.6;
nn=numel(p.nodes); ne=numel(p.edges);
net.nodes=table([p.nodes.id]',string({p.nodes.name})',[p.nodes.x]',[p.nodes.y]', ...
    'VariableNames',{'ID','Name','X','Y'});
net.edges=table([p.edges.id]',[p.edges.fromNode]',[p.edges.toNode]', ...
    [p.edges.length_m]'/1000,[p.edges.tracks]',string({p.edges.line})', ...
    [p.edges.maxSpeed_kmh]',string({p.edges.quality})',string({p.edges.source})', ...
    'VariableNames',{'ID','From','To','Length_km','Tracks','Line','ModelCap_kmh','DistanceStatus','Source'});
net.project=p; net.distanceNote=string(p.description);
net.resources=struct('name',{},'type',{}); net.blocks=cell(ne,1);
net.tokens=zeros(ne,1); net.endMargins=zeros(ne,2); net.junctions=zeros(nn,2);
for e=1:ne
    edge=p.edges(e); len=edge.length_m;
    a=q.loop_m*p.nodes(edge.fromNode).passingLoop; b=q.loop_m*p.nodes(edge.toNode).passingLoop;
    net.endMargins(e,:)=[a b];
    cuts=unique([0,a,c.blockLength:c.blockLength:len,len-b,len]); blocks=zeros(numel(cuts)-1,4);
    for k=1:size(blocks,1)
        blocks(k,1:2)=cuts(k:k+1);
        blocks(k,3)=resource(sprintf('E%02d-B%03d+',e,k),'block');
        if edge.tracks==1 && cuts(k)>=a && cuts(k+1)<=len-b
            blocks(k,4)=blocks(k,3);
        else, blocks(k,4)=resource(sprintf('E%02d-B%03d-',e,k),'block'); end
    end
    net.blocks{e}=blocks;
    if edge.tracks==1, net.tokens(e)=resource(sprintf('Single-section-E%02d',e),'section'); end
end
for j=1:nn
    if strcmp(p.nodes(j).junction,'none'), continue; end
    net.junctions(j,1)=resource(sprintf('J%02d-D1',j),'junction');
    if strcmp(p.nodes(j).junction,'exclusive'), net.junctions(j,2)=net.junctions(j,1);
    else, net.junctions(j,2)=resource(sprintf('J%02d-D2',j),'junction'); end
end
trains=struct([]);
for i=1:numel(p.trains)
    tr=p.trains(i); edges=abs(tr.route(:)'); dirs=sign(tr.route(:)');
    nodes=network.route_nodes(tr.route,p.edges); lengths=[p.edges(edges).length_m]; offsets=[0 cumsum(lengths)];
    demands=zeros(0,4);
    for j=1:numel(edges)
        e=edges(j); b=net.blocks{e}; len=lengths(j); margins=net.endMargins(e,:);
        if dirs(j)>0, positions=b(:,1:2); ids=b(:,3);
        else, positions=[len-b(:,2),len-b(:,1)]; ids=b(:,4); margins=fliplr(margins); end
        demands=[demands;ids,positions+offsets(j),ones(size(ids))]; %#ok<AGROW>
        if net.tokens(e)>0
            demands(end+1,:)=[net.tokens(e),offsets(j)+margins(1),offsets(j+1)-margins(2),2]; %#ok<AGROW>
        end
    end
    for j=2:numel(nodes)-1
        id=net.junctions(nodes(j),1+(dirs(j-1)<0));
        half=min([250,lengths(j-1)/2,lengths(j)/2]);
        if id>0, demands(end+1,:)=[id,offsets(j)-half,offsets(j)+half,3]; end %#ok<AGROW>
    end
    stopIndex=1; stops=zeros(1,numel(tr.stops)); stopNames=strings(numel(tr.stops),1); dwell=stops;
    for j=1:numel(tr.stops)
        stopIndex=find(nodes==tr.stops(j).node & (1:numel(nodes))>stopIndex,1);
        stops(j)=offsets(stopIndex); stopNames(j)=net.nodes.Name(nodes(stopIndex)); dwell(j)=tr.stops(j).dwell_s;
    end
    vehicle=struct('id',tr.id,'label',string(tr.label),'direction',dirs(1), ...
        'edgeDirections',dirs,'departure',tr.departure_s,'edges',edges,'nodes',nodes, ...
        'offsets',offsets,'length',offsets(end),'demands',sortrows(demands,[2 -4]), ...
        'stops',stops,'stopNames',stopNames,'stopDwell',dwell,'trainLength',tr.length_m, ...
        'maxSpeed',tr.maxSpeed_kmh/3.6,'acceleration',tr.acceleration_mps2,'serviceBrake',tr.brake_mps2);
    if isempty(trains), trains=vehicle; else, trains(i)=vehicle; end
end
    function id=resource(name,type)
        id=numel(net.resources)+1; net.resources(id)=struct('name',name,'type',type);
    end
end
