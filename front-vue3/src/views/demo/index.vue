<template>
    <div class="container">
        <el-button type="primary" @click="handleClick(6666)">点击</el-button>
        <el-pagination
            :currentPage="queryParams.currentPage"
            :page-size="queryParams.pageSize"
            :page-sizes="[100, 200, 300, 400]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="400"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            >
        </el-pagination>
        <div>{{queryParams.currentPage}}</div>
        <div>{{queryParams.pageSize}}</div>
    </div>
</template>

<script setup>
import { getCurrentInstance, onMounted, reactive } from 'vue'

// 表单过滤属性写法
// {
//     0:'某某',
//     2:'das'
// }[value]
// ctx类似this，执行上下文
const { ctx } = getCurrentInstance()
// 例：重置表单参数 ctx.$refs.form.resetFields() | 全局设置prototype属性,ctx.***
onMounted(() => {
    console.log(ctx)
    console.log("init...")
})
const queryParams = reactive({
    currentPage:1,
    pageSize:10
})
const handleSizeChange = (num) => {
    console.log("SizeChange",num)
    queryParams.pageSize = num
}
const handleCurrentChange = (num) => {
    console.log("CurrentChange",num)
    queryParams.currentPage = num
}
const handleClick = (val) => {
    console.log(val)
}
</script>
<style lang='scss' scoped>

</style>
