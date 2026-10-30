function nodes=route_nodes(route,edges)
% Signed edge IDs define direction independently for every route leg.
validateattributes(route,{'numeric'},{'vector','nonempty','integer','finite'});
route=route(:)'; assert(all(route~=0) && all(abs(route)<=numel(edges)));
assert(numel(unique(abs(route)))==numel(route),'RailLab:Project','A route cannot traverse the same edge twice in this model.');
nodes=zeros(1,numel(route)+1);
for j=1:numel(route)
    e=edges(abs(route(j))); a=e.fromNode; b=e.toNode;
    if route(j)<0, a=e.toNode; b=e.fromNode; end
    if j>1, assert(nodes(j)==a,'RailLab:Project','Disconnected route edges.'); end
    nodes(j)=a; nodes(j+1)=b;
end
end
