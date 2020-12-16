(module
  
  (func $test 
  (param $a f32)
  (param $b f32)
  (return i32)
    local.get $a
    local.get $b
    f32.gt

  )
)