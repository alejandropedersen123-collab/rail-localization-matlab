function a=architectures()
% Two factors: longitudinal sensor set and diagnostic controls.
a=struct('name',{'GPS','GPS + controls','Fusion','Fusion + controls'}, ...
    'fusion',{false,false,true,true},'controls',{false,true,false,true});
end
