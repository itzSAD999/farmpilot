select n.crop_id, b.category, b.input_name from crop_input_norms n join cost_benchmarks b on b.id = n.benchmark_id limit 10;  
