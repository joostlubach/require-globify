module.exports = function(base, files, config) {
  for (var path in files) {
    files[path] = camelize(files[path]);
  }
  return files;
}

function camelize(s) {
  return s.replace(/(^|[^0-9a-z]+)([0-9a-z])/ig, (_all, _remove, cap) => cap.toUpperCase());
}