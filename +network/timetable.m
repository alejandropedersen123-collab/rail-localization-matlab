function trains=timetable(net,c)
% Eight SYNTHETIC services, not the trains/positions of any real incident.
paths={ [1 2 3 4 5 7 8 9], [1 2 3 4 5 6], [1 2 3 4 5 7 8 10 11 12 13] };
dest=["Malaga" "Sevilla" "Granada" "Malaga" "Malaga" "Sevilla" "Granada" "Malaga"];
family=[1 2 3 1 1 2 3 1]; direction=[-1 -1 -1 -1 1 1 1 1];
departure=[0 600 0 1500 0 600 1200 1800];
trains=struct([]);
for i=1:8
    edges=paths{family(i)}; dir=direction(i);
    if dir<0, edges=fliplr(edges); end
    lengths=net.edges.Length_km(edges)'*1000;
    offsets=[0 cumsum(lengths)];
    if dir>0, nodes=[net.edges.From(edges(1));net.edges.To(edges)];
    else, nodes=[net.edges.To(edges(1));net.edges.From(edges)]; end
    demands=zeros(0,4); % resource, entry, rear-clear coordinate, type (1 block)
    for j=1:numel(edges)
        e=edges(j); b=net.blocks{e}; len=lengths(j);
        if dir>0, positions=b(:,1:2); ids=b(:,3);
        else, positions=[len-b(:,2),len-b(:,1)]; ids=b(:,4); end
        demands=[demands;ids,positions+offsets(j),ones(size(ids))]; %#ok<AGROW>
        if net.tokens(e)>0
            demands(end+1,:)=[net.tokens(e),offsets(j)+c.stationHalfLength, ...
                offsets(j+1)-c.stationHalfLength,2]; %#ok<AGROW>
        end
    end
    for j=2:numel(nodes)-1
        id=net.junctions(nodes(j),1+(dir<0));
        if id>0, demands(end+1,:)=[id,offsets(j)-250,offsets(j)+250,3]; end %#ok<AGROW>
    end
    demands=sortrows(demands,[2 -4]);
    stopNodes=[5 9 13];
    if i==4 || i==8, stopNodes=[2 3 5 8 9]; end
    stopIndex=find(ismember(nodes,stopNodes)); stopIndex(stopIndex==1 | stopIndex==numel(nodes))=[];
    stops=offsets([stopIndex(:)' numel(nodes)]);
    stopNames=net.nodes.Name(nodes([stopIndex(:)' numel(nodes)]));
    if dir>0, label="Madrid > "+dest(i); else, label=dest(i)+" > Madrid"; end
    train=struct('id',sprintf('SIM%02d',i),'label',label,'direction',dir, ...
        'departure',departure(i),'edges',edges,'nodes',nodes,'offsets',offsets, ...
        'length',offsets(end),'demands',demands,'stops',stops,'stopNames',stopNames, ...
        'trainLength',c.trainLength);
    if isempty(trains), trains=train; else, trains(i)=train; end
end
end
