function q=json_project(p)
% Preserve JSON lists when MATLAB sees a one-element array as a scalar.
q=p; q.nodes=num2cell(p.nodes); q.edges=num2cell(p.edges); q.trains=num2cell(p.trains);
q.analysisRoute=num2cell(p.analysisRoute);
q.gpsFaults=num2cell(p.gpsFaults);
for i=1:numel(q.edges), q.edges{i}.gauges_mm=num2cell(p.edges(i).gauges_mm); end
for i=1:numel(q.trains)
    q.trains{i}.route=num2cell(p.trains(i).route);
    q.trains{i}.stops=num2cell(p.trains(i).stops);
end
end
