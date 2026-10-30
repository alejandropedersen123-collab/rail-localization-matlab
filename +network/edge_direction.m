function direction=edge_direction(train,leg)
if isfield(train,'edgeDirections'), direction=train.edgeDirections(leg);
else, direction=train.direction; end
end
